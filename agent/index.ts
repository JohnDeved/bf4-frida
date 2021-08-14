import chalk from 'chalk'

const spottingCache: {[key: string]: string | undefined} = {}

enum SpottingEnum {
  none,
  active,
  passive,
  radar,
  unspottable,
}

class FrostByteClass {
  constructor (public ptr: NativePointer) {}

  get classInfoPtr () {
    const code = this.ptr.readPointer()
    if (code.isNull()) return

    const classInfoCode = code.readPointer()
    if (classInfoCode.isNull()) return

    console.log(classInfoCode.add(0x3).readU32().toString(16), 'offset')
    const classInfo = classInfoCode.add(classInfoCode.add(0x3).readU32() + 0x7)
    if (classInfo.isNull()) return

    return classInfo
  }
  
  get className () {
    const classInfo = this.classInfoPtr
    if (!classInfo || classInfo.isNull()) return

    const memberInfo = classInfo.readPointer()
    if (memberInfo.isNull()) return

    return memberInfo.readPointer().readCString()
  }
}


class SoldierEntity extends FrostByteClass {
  get spotType () {
    const spotTypePtr = this.ptr.add(0xBF0).readPointer().add(0x50)
    if (spotTypePtr.isNull()) return

    const typeNum = spotTypePtr.readU8()
    return SpottingEnum[typeNum] as keyof typeof SpottingEnum | undefined
  }

  set spotType (value: keyof typeof SpottingEnum | undefined) {
    if (!value) return

    const spotTypePtr = this.ptr.add(0xBF0).readPointer().add(0x50)
    if (spotTypePtr.isNull()) return

    spotTypePtr.writeU8(SpottingEnum[value])
  }

  get renderFlags () {
    const renderFlagsPtr = this.ptr.add(0x4F4)
    if (renderFlagsPtr.isNull()) return 0

    return renderFlagsPtr.readU32()
  }

  set renderFlags (value: number) {
    const renderFlagsPtr = this.ptr.add(0x4F4)
    if (renderFlagsPtr.isNull()) return

    renderFlagsPtr.writeU32(value)
  }
}

class VehicleEntity extends FrostByteClass {
  private findSpottingOffset (path: string) {
    for (let index = 0x510; index <= 0xD80; index += 0x8) {
      const spottingComponentPtr = this.ptr.add(index).readPointer().add(0x0).readPointer()
      if (!spottingComponentPtr.isNull()) continue

      if (spottingComponentPtr.toInt32() === 0x141BB04F0) {
        if (this.path !== path) {
          console.log(chalk.red('!!! vehicle class did not match'))
          return
        }

        const offsetHex = index.toString(16)
        console.log(chalk.green('offset for', path, 'found at', offsetHex))
        spottingCache[path] = `0x${offsetHex}`
        return offsetHex
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

    const spotTypePtr = this.ptr.add(offset).readPointer().add(0x50)
    if (spotTypePtr.isNull()) return

    const typeNum = spotTypePtr.readU8()
    return SpottingEnum[typeNum] as keyof typeof SpottingEnum | undefined
  }

  set spotType (value: keyof typeof SpottingEnum | undefined) {
    if (!value) return

    const offset = Number(this.getSpottingOffsetCache())
    if (!offset) return

    const spotTypePtr = this.ptr.add(offset).readPointer().add(0x50)
    if (spotTypePtr.isNull()) return

    spotTypePtr.writeU8(SpottingEnum[value])
  }
}

class Player {
  constructor (public ptr: NativePointer) {}

  get isInVehicle () {
    const entityPtr = this.entityPtr
    if (entityPtr.isNull()) return

    return entityPtr.readU64().toNumber() === 0x141D3D200 // vehicle head ptr
  }

  get isOnFoot () {
    const entityPtr = this.entityPtr
    if (entityPtr.isNull()) return

    return entityPtr.readU64().toNumber() === 0x141E600C0 // soldier head ptr
  }

  get name () {
    return this.ptr.add(0x40).readCString()
  }

  get teamId () {
    return this.ptr.add(0x13CC).readUInt()
  }

  get entityPtr () {
    return this.ptr.add(0x14D0).readPointer()
  }

  get entity () {
    return this.soldier || this.vehicle
  }

  get soldier () {
    if (this.isOnFoot) {
      const entityPtr = this.entityPtr
      if (entityPtr.isNull()) return
      return new SoldierEntity(entityPtr)
    }
  }

  get vehicle () {
    if (this.isInVehicle) {
      const entityPtr = this.entityPtr
      if (entityPtr.isNull()) return
      return new VehicleEntity(entityPtr)
    }
  }
}

class Game {
  readonly context = ptr(0x142670d80).readPointer()

  get isScreenShotting () {
    const screenShotClass = ptr(0x14273D6E8).readPointer()
    if (screenShotClass.isNull()) return false

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

      if (!playerPtr.isNull()) {
        players.push(new Player(playerPtr))
      }
    }

    return players
  }
}

const game = new Game()

let screenShotHappening = false
let benchmarkCount = 0

function render () {
  const throttle = Date.now() 
  benchmarkCount++

  if (screenShotHappening) {
    if (!game.isScreenShotting) {
      console.log(chalk.yellow('!!! screenshot done'))
      screenShotHappening = false
    }

    setTimeout(render, /* 1000ms / 144 = ~6*/ Math.max(6 - (Date.now() - throttle)))
    return
  }

  const localTeamId = game.playerLocal.teamId
  const players = game.players
  const activeEntities: Array<SoldierEntity | VehicleEntity> = []

  for (const player of players) {   
    if (localTeamId === player.teamId) continue
    
    const entity = player.entity
    if (!entity || entity.ptr.isNull()) continue
    
    activeEntities.push(entity)
    const spotType = entity.spotType
    if (spotType === 'active') continue   
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

  setTimeout(render, /* 1000ms / 144 = ~6*/ Math.max(6 - (Date.now() - throttle), 0))
}

setInterval(() => {
  console.log(chalk.gray('running at', benchmarkCount, 'fps'))
  benchmarkCount = 0
}, 1000)


render()

// for (let currentClass = ptr(0x1423e41b8).readPointer(); !currentClass.isNull(); currentClass = currentClass.add(0x8).readPointer()) {
//   const currentMember = currentClass.readPointer()
//   if (currentMember.isNull()) continue

//   const currentMemberNamePtr = currentMember.readPointer()
//   if (currentMemberNamePtr.isNull()) continue

//   const currentMemberName = currentMemberNamePtr.readCString()

//   if (currentMemberName?.includes('Client') && currentMemberName?.includes('Vehicle') && currentMemberName.includes('Entity')) {
//     console.log(currentMemberName, currentClass.toString(16))
//   }
// }