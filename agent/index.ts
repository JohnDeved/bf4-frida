import chalk from 'chalk'

enum SpottingEnum {
  none,
  active,
  passive,
  radar,
  unspottable,
}

class Utils {
  static spottingCache: {[key: string]: string | undefined} = {}
  static classHeadCache: {[key: string]: string | undefined} = {}

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

  static getClassInfoPtr (headPtr: NativePointer) {
    if (Utils.isInvalidPtr(headPtr)) return

    const classInfoCode = headPtr.readPointer()
    if (Utils.isInvalidPtr(classInfoCode)) return

    const classInfo = classInfoCode.add(classInfoCode.add(0x3).readU32() + 0x7)
    if (Utils.isInvalidPtr(classInfo)) return

    return classInfo
  }

  static getClassName (ptr: NativePointer) {
    const headPtr = ptr.readPointer()
    if (Utils.isInvalidPtr(headPtr)) return

    const headPtrAddress = headPtr.toString()
    const cache = this.classHeadCache[headPtrAddress]
    if (cache) return cache

    const classInfo = this.getClassInfoPtr(headPtr)
    if (Utils.isInvalidPtr(classInfo)) return

    const memberInfo = classInfo.readPointer()
    if (Utils.isInvalidPtr(memberInfo)) return

    const className = memberInfo.readPointer().readCString()
    if (!className) return

    console.log(chalk.green('[info]: cached', headPtrAddress, '->', className))
    this.classHeadCache[headPtrAddress] = className
    return className
  }

  static autoEntity (entityPtr?: NativePointer): SoldierEntity | VehicleEntity | undefined {
    if (Utils.isInvalidPtr(entityPtr)) return

    const className = Utils.getClassName(entityPtr)

    if (className === 'ClientSoldierEntity') {
      return new SoldierEntity(entityPtr)
    }

    if (className === 'ClientVehicleEntity') {
      return new VehicleEntity(entityPtr)
    }
  }
}

class Vec3 {
  constructor (public ptr: NativePointer) {}

  get x () {
    return this.ptr.readFloat()
  }

  get y () {
    return this.ptr.add(0x4).readFloat()
  }

  get z () {
    return this.ptr.add(0x8).readFloat()
  }

  toArray () {
    return [this.x, this.y, this.z]
  }

  toString () {
    return `[${this.x}, ${this.y}, ${this.z}]`
  }
}

class FrostByteClass {
  constructor (public ptr: NativePointer) {}

  get className () {
    return Utils.getClassName(this.ptr)
  }
}

class Weapon extends FrostByteClass {
  get handler () {
    const handlerPtr = this.ptr.add(0x890).readPointer()
    if (Utils.isInvalidPtr(handlerPtr)) return

    return handlerPtr
  }

  get activeSlot () {
    const activeSlotPtr = this.ptr.add(0xA98)
    if (Utils.isInvalidPtr(activeSlotPtr)) return

    return activeSlotPtr.readU32()
  }

  get weaponPtr () {
    const handler = this.handler
    if (Utils.isInvalidPtr(handler)) return

    const activeSlot = this.activeSlot
    if (typeof activeSlot === 'undefined') return

    const weaponPtr = handler.add(activeSlot * 0x8).readPointer()
    if (Utils.isInvalidPtr(weaponPtr)) return

    return weaponPtr
  }

  get name () {
    return this.weaponPtr?.add(0x30).readPointer().add(0x130).readPointer().readCString()
  }

  get aimingSimulationPtr () {
    const aimingPtr = this.weaponPtr?.add(0x4988).readPointer()
    if (Utils.isInvalidPtr(aimingPtr)) return

    return aimingPtr
  }

  get targetEntity () {
    const targetPtr = this.aimingSimulationPtr?.add(0x158).readPointer()
    return Utils.autoEntity(targetPtr)
  }

  get targetPos () {
    const targetPos = this.aimingSimulationPtr?.add(0x160)
    if (Utils.isInvalidPtr(targetPos)) return

    return new Vec3(targetPos)
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

  get weapon () {
    const weaponComponentPtr = this.ptr.add(0x570).readPointer()
    if (Utils.isInvalidPtr(weaponComponentPtr)) return

    return new Weapon(weaponComponentPtr)
  }

  get isOccluded () {
    const occludedPtr = this.ptr.add(0x05B1)
    if (Utils.isInvalidPtr(occludedPtr)) return

    return Boolean(occludedPtr.readU8())
  }

  get player (): Player | undefined {
    const playerPtr = this.ptr.add(0x1E0).readPointer()
    if (Utils.isInvalidPtr(playerPtr)) return

    return new Player(playerPtr)
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
            console.log(chalk.red('[error]: vehicle class did not match'))
            return
          }
  
          const offsetHex = index.toString(16)
          console.log(chalk.green('[info]: offset for', path, 'found at', offsetHex))
          Utils.spottingCache[path] = `0x${offsetHex}`
          return Utils.spottingCache[path]
        }
      } catch (e) {
        continue
      }
    }
    console.log(chalk.red('[error]: offset not found for', path))
  }

  private getSpottingOffsetCache () {
    const path = this.path
    if (!path) return
    let offset = Utils.spottingCache[path]
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

    return Utils.getClassName(entityPtr) === 'ClientVehicleEntity'
  }

  get isOnFoot () {
    if (Utils.isInvalidPtr(this.ptr)) return
    const entityPtr = this.entityPtr
    if (Utils.isInvalidPtr(entityPtr)) return

    return Utils.getClassName(entityPtr) === 'ClientSoldierEntity'
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

      if (Utils.isValidPtr(playerPtr)) {
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

function continueRender (...args: Parameters<typeof render>) {
  benchmarkCount++
  const wait = Math.max(/* 1000ms / 144 = ~6*/ 6 - (Date.now() - heartBeat), 0)
  skippedFrames += wait
  setTimeout(() => render(...args), wait)
}

function spot (player: Player) {
  const entity = player.entity
  if (!entity || Utils.isInvalidPtr(entity.ptr)) return
  
  const spotType = entity.spotType
    if (!spotType || spotType === 'active') return entity
  entity.spotType = 'active'
  
  console.log(spotType, '-> active [', player.name, entity instanceof VehicleEntity ? `: ${entity.vehicleName} ]` : ']')
  return entity
}

function paintTarget (player: Player) {
  const aimTarget = player.soldier?.weapon?.targetEntity
  if (aimTarget && aimTarget instanceof SoldierEntity) {
    if (!aimTarget.player || aimTarget.player.teamId === player.teamId) return
    if (aimTarget.renderFlags === 4) return aimTarget
    aimTarget.renderFlags = 4
    return aimTarget
  }
}

function render (paintedTarget?: SoldierEntity): void {
  const throttle = Date.now() 
  heartBeat = throttle

  if (screenShotHappening) {
    if (!game.isScreenShotting) {
      console.log(chalk.yellow('[info]: screenshot done'))
      screenShotHappening = false
    }

    return continueRender()
  }

  const playerLocal = game.playerLocal
  const localTeamId = playerLocal.teamId
  const players = game.players
  const activeEntities: Array<SoldierEntity | VehicleEntity> = []

  for (const player of players) {
    if (Utils.isInvalidPtr(player.ptr)) continue
    if (localTeamId === player.teamId) continue

    const spotted = spot(player)
    if (spotted) activeEntities.push(spotted)
  }

  const painted = paintTarget(playerLocal)
  if (!painted && paintedTarget) {
    paintedTarget.renderFlags = 0
  }

  if (painted) {
    if (paintedTarget && paintedTarget.ptr.toString() !== paintedTarget.ptr.toString()) paintedTarget.renderFlags = 0
    paintedTarget = painted
  }

  if (game.isScreenShotting) {
    screenShotHappening = true
    console.log(chalk.yellow('[info]: screenshot cleanup'))

    for (const entity of activeEntities) {
      entity.spotType = 'none'
    }

    if (paintedTarget) paintedTarget.renderFlags = 0
    return continueRender()
  }

  continueRender(paintedTarget)
}

setInterval(() => {
  console.log(chalk.gray('running at', benchmarkCount, '/', benchmarkCount + skippedFrames, 'fps'))
  benchmarkCount = 0
  skippedFrames = 0

  if (heartBeat + 1000 <= Date.now()) {
    console.log(chalk.red('[error]: restoring main loop'))
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

//   if (currentMemberName?.includes('Simulation')) {
//     console.log(currentMemberName, currentClass.toString(16))
//   }
// }