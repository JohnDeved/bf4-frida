import chalk from 'chalk'

const spottingCache: {[key: string]: string | undefined} = {}

enum SpottingEnum {
  none,
  active,
  passive,
  radar,
  unspottable,
}


class Utils {
  static isValidPtr (ptr?: NativePointer): ptr is NativePointer {
    if (!ptr) return false

    try {
      void ptr.readU8()
    } catch {
      return false
    }
    
    return !ptr.isNull()
  }

  static isInvalidPtr (ptr?: NativePointer): ptr is undefined {
    return !this.isValidPtr(ptr)
  }

  static getClassInfoPtr (ptr: NativePointer) {
    const code = ptr.readPointer()
    if (Utils.isInvalidPtr(code)) return

    const classInfoCode = code.readPointer()
    if (Utils.isInvalidPtr(classInfoCode)) return

    const classInfo = classInfoCode.add(classInfoCode.add(0x3).readU32() + 0x7)
    if (Utils.isInvalidPtr(classInfo)) return

    return classInfo
  }

  static getClassName (ptr: NativePointer) {
    const classInfo = this.getClassInfoPtr(ptr)
    if (!classInfo || Utils.isInvalidPtr(classInfo)) return

    const memberInfo = classInfo.readPointer()
    if (Utils.isInvalidPtr(memberInfo)) return

    return memberInfo.readPointer().readCString()
  }
}

class FrostByteClass {
  constructor (public ptr: NativePointer) {}

  get className () {
    return Utils.getClassName(this.ptr)
  }
}


class SoldierEntity extends FrostByteClass {
  get spotType () {
    const spotTypePtr = this.ptr.add(0xBF0).readPointer().add(0x50)
    if (Utils.isInvalidPtr(spotTypePtr)) return

    const typeNum = spotTypePtr.readU8()
    return SpottingEnum[typeNum] as keyof typeof SpottingEnum | undefined
  }

  set spotType (value: keyof typeof SpottingEnum | undefined) {
    if (!value) return

    const spotTypePtr = this.ptr.add(0xBF0).readPointer().add(0x50)
    if (Utils.isInvalidPtr(spotTypePtr)) return

    spotTypePtr.writeU8(SpottingEnum[value])
  }

  get renderFlags () {
    const renderFlagsPtr = this.ptr.add(0x4F4)
    if (Utils.isInvalidPtr(renderFlagsPtr)) return 0

    return renderFlagsPtr.readU32()
  }

  set renderFlags (value: number) {
    const renderFlagsPtr = this.ptr.add(0x4F4)
    if (Utils.isInvalidPtr(renderFlagsPtr)) return

    renderFlagsPtr.writeU32(value)
  }
}

class VehicleEntity extends FrostByteClass {
  private findSpottingOffset (path: string) {
    for (let index = 0x510; index <= 0xD80; index += 0x8) {
      try {
        if (Utils.isInvalidPtr(this.ptr)) continue

        const checkPtr = this.ptr.add(index).readPointer()
        if (Utils.isInvalidPtr(checkPtr)) continue

        if (Utils.getClassName(checkPtr) === 'ClientSpottingTargetComponent') {
          if (this.path !== path) {
            console.log(chalk.red('!!! vehicle class did not match'))
            return
          }
  
          const offsetHex = index.toString(16)
          console.log(chalk.green('offset for', path, 'found at', offsetHex))
          spottingCache[path] = `0x${offsetHex}`
          return spottingCache[path]
        }
      } catch (e) {
        continue
      }
    }
    console.log(chalk.red('!!! offset not found for', path))
  }

  private getSpottingOffsetCache () {
    const path = this.path
    if (!path) return
    let offset = spottingCache[path]
    if (!offset) offset = this.findSpottingOffset(path)
    return offset
  }

  get vehicleName () {
    return this.ptr.add(0x30).readPointer().add(0xF0).readPointer().readCString()
  }

  get path () {
    return this.ptr.add(0x30).readPointer().add(0x130).readPointer().readCString()
  }

  get spotType () {
    const offset = Number(this.getSpottingOffsetCache())
    if (!offset) return
  
    if (Utils.isInvalidPtr(this.ptr)) return

    const spottingComponent = this.ptr.add(offset).readPointer()
    if (Utils.isInvalidPtr(spottingComponent)) return

    const spotTypeOffset = spottingComponent.add(0x50)
    if (Utils.isInvalidPtr(spotTypeOffset)) return

    const typeNum = spotTypeOffset.readU8()
    return SpottingEnum[typeNum] as keyof typeof SpottingEnum | undefined
  }

  set spotType (value: keyof typeof SpottingEnum | undefined) {
    if (!value) return

    const offset = Number(this.getSpottingOffsetCache())
    if (!offset) return

    const spotTypePtr = this.ptr.add(offset).readPointer().add(0x50)
    if (Utils.isInvalidPtr(spotTypePtr)) return

    spotTypePtr.writeU8(SpottingEnum[value])
  }
}

class Player {
  constructor (public ptr: NativePointer) {}

  get isInVehicle () {
    if (Utils.isInvalidPtr(this.ptr)) return
    const entityPtr = this.entityPtr
    if (Utils.isInvalidPtr(entityPtr)) return

    return entityPtr.readU64().toNumber() === 0x141D3D200 // vehicle head ptr
  }

  get isOnFoot () {
    if (Utils.isInvalidPtr(this.ptr)) return
    const entityPtr = this.entityPtr
    if (Utils.isInvalidPtr(entityPtr)) return

    return entityPtr.readU64().toNumber() === 0x141E600C0 // soldier head ptr
  }

  get name () {
    if (Utils.isInvalidPtr(this.ptr)) return
    return this.ptr.add(0x40).readCString()
  }

  get teamId () {
    if (Utils.isInvalidPtr(this.ptr)) return
    return this.ptr.add(0x13CC).readUInt()
  }

  get entityPtr () {
    if (Utils.isInvalidPtr(this.ptr)) return
    return this.ptr.add(0x14D0).readPointer()
  }

  get entity () {
    return this.soldier || this.vehicle
  }

  get soldier () {
    if (this.isOnFoot) {
      const entityPtr = this.entityPtr
      if (Utils.isInvalidPtr(entityPtr)) return
      return new SoldierEntity(entityPtr)
    }
  }

  get vehicle () {
    if (this.isInVehicle) {
      const entityPtr = this.entityPtr
      if (Utils.isInvalidPtr(entityPtr)) return
      return new VehicleEntity(entityPtr)
    }
  }
}

class Game {
  readonly context = ptr(0x142670d80).readPointer()

  get isScreenShotting () {
    const screenShotClass = ptr(0x14273D6E8).readPointer()
    if (Utils.isInvalidPtr(screenShotClass)) return false

    return !screenShotClass.add(0x10).readS64().equals(-1)
  }

  get playerManager () {
    return this.context.add(0x60).readPointer()
  }

  get playerLocal () {
    const playerPtr = this.playerManager.add(0x540).readPointer()
    return new Player(playerPtr)
  }

  get players () {
    const playersPtr = this.playerManager.add(0x548).readPointer()

    const players: Player[] = []

    for (let i = 0; i <= 64; i++) {
      const playerPtr = playersPtr.add(i * 0x8).readPointer()

      if (!Utils.isInvalidPtr(playerPtr)) {
        players.push(new Player(playerPtr))
      }
    }

    return players
  }
}

const game = new Game()

let screenShotHappening = false
let benchmarkCount = 0
let skippedFrames = 0
let heartBeat = Date.now()

function continueRender () {
  benchmarkCount++
  const wait = Math.max(/* 1000ms / 144 = ~6*/ 6 - (Date.now() - heartBeat), 0)
  skippedFrames += wait
  setTimeout(render, wait)
}

function render () {
  const throttle = Date.now() 
  heartBeat = throttle

  if (screenShotHappening) {
    if (!game.isScreenShotting) {
      console.log(chalk.yellow('!!! screenshot done'))
      screenShotHappening = false
    }

    return continueRender()
  }

  const localTeamId = game.playerLocal.teamId
  const players = game.players
  const activeEntities: Array<SoldierEntity | VehicleEntity> = []

  for (const player of players) {
    if (Utils.isInvalidPtr(player.ptr)) continue
    if (localTeamId === player.teamId) continue
    
    const entity = player.entity
    if (!entity || Utils.isInvalidPtr(entity.ptr)) continue
    
    activeEntities.push(entity)
    const spotType = entity.spotType
    
    if (!spotType || spotType === 'active') continue   
    entity.spotType = 'active'
    
    console.log(spotType, '=> active [', player.name, entity instanceof VehicleEntity ? `: ${entity.vehicleName} ]` : ']')
  }


  if (game.isScreenShotting) {
    screenShotHappening = true
    console.log(chalk.yellow('!!! screenshot cleanup'))

    for (const entity of activeEntities) {
      entity.spotType = 'none'
    }
    
  }

  continueRender()
}

setInterval(() => {
  console.log(chalk.gray('running at', benchmarkCount, '/', benchmarkCount + skippedFrames, 'fps'))
  benchmarkCount = 0
  skippedFrames = 0

  if (heartBeat + 1000 <= Date.now()) {
    console.log(chalk.red('restoring'))
    render()
  }
}, 1000)


render()

// for (let currentClass = ptr(0x1423e41b8).readPointer(); !Utils.isInvalidPtr(currentClass); currentClass = currentClass.add(0x8).readPointer()) {
//   const currentMember = currentClass.readPointer()
//   if (Utils.isInvalidPtr(currentMember)) continue

//   const currentMemberNamePtr = currentMember.readPointer()
//   if (Utils.isInvalidPtr(currentMemberNamePtr)) continue

//   const currentMemberName = currentMemberNamePtr.readCString()

//   if (currentMemberName?.includes('Client') && currentMemberName?.includes('Vehicle') && currentMemberName.includes('Entity')) {
//     console.log(currentMemberName, currentClass.toString(16))
//   }
// }