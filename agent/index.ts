import { color } from './color.js'
console.log(color.green('[info]: agent loaded'))

enum SpottingEnum {
  none,
  active,
  passive,
  radar,
  unspottable,
}

class Utils {
  static spottingCache: {[key: string]: string | null | undefined} = {}
  static classHeadCache: {[key: string]: string | undefined} = {}
  static classInfoCache: {[key: string]: NativePointer | undefined} = {}
  static weaponSwayCache: {[key: string]: [number, number, number, number] | undefined} = {}
  static weaponSwayModifiedCache: {[key: string]: boolean | undefined} = {}

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

  static getClassNameByHeader (ptr: NativePointer) {
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

    console.log(color.green('[info]: cached headPtr', headPtrAddress, '->', className))
    this.classHeadCache[headPtrAddress] = className

    if (!this.classInfoCache[className]) {
      console.log(color.green('[info]: cached classInfo', className, '->', classInfo.toString()))
      this.classInfoCache[className] = classInfo
    }

    return className
  }

  static findClassInfoByName (className: string) {
    const cache = this.classInfoCache[className]
    if (cache) return cache

    let counter = 0
    for (let currentClass = ptr(0x1423e41b8).readPointer(); !Utils.isInvalidPtr(currentClass); currentClass = currentClass.add(0x8).readPointer()) {
      const currentMember = currentClass.readPointer()
      if (Utils.isInvalidPtr(currentMember)) continue
    
      const currentMemberNamePtr = currentMember.readPointer()
      if (Utils.isInvalidPtr(currentMemberNamePtr)) continue
    
      const currentMemberName = currentMemberNamePtr.readCString()

      if (!currentMemberName) continue
      if (!this.classInfoCache[currentMemberName]) {
        counter++
        this.classInfoCache[currentMemberName] = currentClass
      }
      
      if (currentMemberName === className) {
        
        console.log(color.green('[info]: cached', String(counter), 'classInfo pointers'))
        return currentClass
      }
    }
  }

  static getFirstInstanceOf (className: string) {
    const classInfo = this.findClassInfoByName(className)
    if (Utils.isInvalidPtr(classInfo)) return

    const firstInstancePtr = classInfo.add(0x60).readPointer().sub(0x40)
    if (Utils.isInvalidPtr(firstInstancePtr)) return

    return this.autoEntity(firstInstancePtr)
  }

  static autoEntity (entityPtr?: NativePointer): SoldierEntity | VehicleEntity | undefined {
    if (Utils.isInvalidPtr(entityPtr)) return

    const className = Utils.getClassNameByHeader(entityPtr)

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

  toArray (): [x: number, y: number, z: number] {
    return [this.x, this.y, this.z]
  }

  toString () {
    return `[${this.x}, ${this.y}, ${this.z}]`
  }
}

class FrostByteClass {
  constructor (public ptr: NativePointer) {}

  get className () {
    return Utils.getClassNameByHeader(this.ptr)
  }

  get nextInstance (): SoldierEntity | VehicleEntity | undefined {
    const nextInstancePtr = this.ptr.add(0x40).readPointer().sub(0x40)
    if (Utils.isInvalidPtr(nextInstancePtr)) return

    return Utils.autoEntity(nextInstancePtr)
  }
}

class WeaponSway {
  constructor (public ptr: NativePointer, private weaponName: string) {
    const cache = Utils.weaponSwayCache[this.weaponName]
    if (cache) return

    Utils.weaponSwayCache[this.weaponName] = this.data
    console.log(color.green('[info]: cached SwayData', this.weaponName, '->', String(this.data)))
  }

  get isModified () {
    let cache = Utils.weaponSwayModifiedCache[this.weaponName]
    if (cache) return cache

    Utils.weaponSwayModifiedCache[this.weaponName] = false
    return false
  }

  set isModified (value: boolean) {
    Utils.weaponSwayModifiedCache[this.weaponName] = value
  }

  get getWeaponSwayDataPtr () {
    const weaponSwayDataPtr = this.ptr.add(0x8).readPointer()
    if (Utils.isInvalidPtr(weaponSwayDataPtr)) return

    return weaponSwayDataPtr
  }

  get deviationZoom () {
    const weaponSwayDataPtr = this.getWeaponSwayDataPtr?.add(0x430)
    if (Utils.isInvalidPtr(weaponSwayDataPtr)) return 1

    return weaponSwayDataPtr.readFloat()
  }

  set deviationZoom (value: number) {
    const weaponSwayDataPtr = this.getWeaponSwayDataPtr?.add(0x430)
    if (Utils.isInvalidPtr(weaponSwayDataPtr)) return

    weaponSwayDataPtr.writeFloat(value)
  }

  get gameplayDeviationZoom () {
    const weaponSwayDataPtr = this.getWeaponSwayDataPtr?.add(0x434)
    if (Utils.isInvalidPtr(weaponSwayDataPtr)) return 1

    return weaponSwayDataPtr.readFloat()
  }
  
  set gameplayDeviationZoom (value: number) {
    const weaponSwayDataPtr = this.getWeaponSwayDataPtr?.add(0x434)
    if (Utils.isInvalidPtr(weaponSwayDataPtr)) return

    weaponSwayDataPtr.writeFloat(value)
  }

  get deviationNoZoom () {
    const weaponSwayDataPtr = this.getWeaponSwayDataPtr?.add(0x438)
    if (Utils.isInvalidPtr(weaponSwayDataPtr)) return 1

    return weaponSwayDataPtr.readFloat()
  }  
  
  set deviationNoZoom (value: number) {
    const weaponSwayDataPtr = this.getWeaponSwayDataPtr?.add(0x438)
    if (Utils.isInvalidPtr(weaponSwayDataPtr)) return

    weaponSwayDataPtr.writeFloat(value)
  }

  get gameplayDeviationNoZoom () {
    const weaponSwayDataPtr = this.getWeaponSwayDataPtr?.add(0x43C)
    if (Utils.isInvalidPtr(weaponSwayDataPtr)) return 1

    return weaponSwayDataPtr.readFloat()
  }

  set gameplayDeviationNoZoom (value: number) {
    const weaponSwayDataPtr = this.getWeaponSwayDataPtr?.add(0x43C)
    if (Utils.isInvalidPtr(weaponSwayDataPtr)) return

    weaponSwayDataPtr.writeFloat(value)
  }

  get data (): [number, number, number, number] {
    return [
      this.deviationZoom,
      this.gameplayDeviationZoom,
      this.deviationNoZoom,
      this.gameplayDeviationNoZoom,
    ]
  }

  set data (value: [number, number, number, number]) {
    console.log(color.green('[info]: setting SwayData', this.weaponName, '->', String(value)))
    this.deviationZoom = value[0]
    this.gameplayDeviationZoom = value[1]
    this.deviationNoZoom = value[2]
    this.gameplayDeviationNoZoom = value[3]
  }

  getDefaultData (): [number, number, number, number] {
    // const cache = Utils.weaponSwayCache[this.weaponName]

    // if (cache) {
    //   return cache
    // }

    // console.log(color.red('[error]: no SwayData cache found for', this.weaponName))

    // lets just assume the default is always the same
    return [1, 1, 1, 1]
  }

  isDefaultData (): boolean {
    const defaultData = this.getDefaultData()
    const currentData = this.data

    return defaultData.every((value, index) => value === currentData[index])
  }

  reset () {
    this.data = this.getDefaultData()
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

  isPrimaryOrSecondary () {
    const activeSlot = this.activeSlot
    if (typeof activeSlot === 'undefined') return
    if (activeSlot === 0 || activeSlot === 1) return true
  }

  get weaponPtr () {
    const handler = this.handler
    if (Utils.isInvalidPtr(handler)) return

    const activeSlot = this.activeSlot
    if (typeof activeSlot === 'undefined') return

    const weaponPtrAddr = handler.add(activeSlot * 0x8)
    if (Utils.isInvalidPtr(weaponPtrAddr)) return
  
    const weaponPtr = weaponPtrAddr.readPointer()
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

  get weaponFiringPtr () {
    const weaponFiringPtr = this.weaponPtr?.add(0x49C0).readPointer()
    if (Utils.isInvalidPtr(weaponFiringPtr)) return

    return weaponFiringPtr
  }

  get getWeaponSwayPtr () {
    const weaponSwayPtr = this.weaponFiringPtr?.add(0x78).readPointer()
    if (Utils.isInvalidPtr(weaponSwayPtr)) return

    return weaponSwayPtr
  }

  get getWeaponSway () {
    const weaponSwayPtr = this.getWeaponSwayPtr
    const weaponName = this.name

    if (weaponSwayPtr && weaponName) {
      return new WeaponSway(weaponSwayPtr, weaponName)
    }
  }

  get bulletsInMagazine () {
    const bulletsInMagazinePtr = this.weaponFiringPtr?.add(0x1A0)
    if (Utils.isInvalidPtr(bulletsInMagazinePtr)) return

    return bulletsInMagazinePtr.readU32()
  }

  get bulletsInReserve () {
    const bulletsInReservePtr = this.weaponFiringPtr?.add(0x1A4)
    if (Utils.isInvalidPtr(bulletsInReservePtr)) return

    return bulletsInReservePtr.readU32()
  }
}

class ControllableEntity extends FrostByteClass {
  
  get allowRenderTroughWalls () {
    const allowRenderTroughWallsPtr = this.ptr.add(0xA1)
    if (Utils.isInvalidPtr(allowRenderTroughWallsPtr)) return

    return Boolean(allowRenderTroughWallsPtr.readU8())
  }

  set allowRenderTroughWalls (value: boolean | undefined) {
    if (typeof value === 'undefined') return
    const allowRenderTroughWallsPtr = this.ptr.add(0x1A)
    if (Utils.isInvalidPtr(allowRenderTroughWallsPtr)) return

    allowRenderTroughWallsPtr.writeU8(Number(value))
  }
}

class SoldierEntity extends ControllableEntity {
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

  get predictionPtr () {
    const predictionPtr = this.ptr.add(0x0490).readPointer()
    if (Utils.isInvalidPtr(predictionPtr)) return

    return predictionPtr
  }

  get pos () {
    const posPtr = this.predictionPtr?.add(0x30)
    if (Utils.isInvalidPtr(posPtr)) return

    return new Vec3(posPtr)
  }
}

class VehicleEntity extends ControllableEntity {
  private findSpottingOffset (path: string) {
    if (Utils.spottingCache[path] === null) return
    for (let index = 0x510; index <= 0xD80; index += 0x8) {
      try {
        if (Utils.isInvalidPtr(this.ptr)) continue

        const checkPtr = this.ptr.add(index).readPointer()
        if (Utils.isInvalidPtr(checkPtr)) continue

        if (Utils.getClassNameByHeader(checkPtr) === 'ClientSpottingTargetComponent') {
          if (this.path !== path) {
            console.log(color.red('[error]: vehicle class did not match'))
            return
          }
  
          const offsetHex = index.toString(16)
          console.log(color.green('[info]: offset for', path, 'found at', offsetHex))
          Utils.spottingCache[path] = `0x${offsetHex}`
          return Utils.spottingCache[path]
        }
      } catch (e) {
        continue
      }
    }
    Utils.spottingCache[path] = null
    console.log(color.red('[error]: offset not found for', path))
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

  // vehicle render flag offset: 0x4D2 (uint32)
  // visible: 200
  // invisible: 300
  // glow: 400
}

class Player {
  constructor (public ptr: NativePointer) {}

  get isInVehicle () {
    if (Utils.isInvalidPtr(this.ptr)) return
    const entityPtr = this.entityPtr
    if (Utils.isInvalidPtr(entityPtr)) return

    return Utils.getClassNameByHeader(entityPtr) === 'ClientVehicleEntity'
  }

  get isOnFoot () {
    if (Utils.isInvalidPtr(this.ptr)) return
    const entityPtr = this.entityPtr
    if (Utils.isInvalidPtr(entityPtr)) return

    return Utils.getClassNameByHeader(entityPtr) === 'ClientSoldierEntity'
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
  const wait = Math.max(/* 1000ms / 144 = ~6*/ 5 - (Date.now() - heartBeat), 0)
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
    if (aimTarget.renderFlags === 5) return aimTarget
    aimTarget.renderFlags = 5
    return aimTarget
  }
}

function render (): void {
  const throttle = Date.now() 
  heartBeat = throttle

  if (screenShotHappening) {
    if (!game.isScreenShotting) {
      console.log(color.yellow('[info]: screenshot done'))
      screenShotHappening = false
    }

    continueRender()
    return
  }

  const playerLocal = game.playerLocal
  const localTeamId = playerLocal.teamId
  const players = game.players
  const playerLocalWeapon = playerLocal.soldier?.weapon
  const playerLocalWeaponName = playerLocalWeapon?.name
  const activeEntities: Array<SoldierEntity | VehicleEntity> = []
  const paintedTargets: SoldierEntity[] = []
  const painted = paintTarget(playerLocal)
  const isWeaponPrimaryOrSecondary = playerLocalWeapon?.isPrimaryOrSecondary()

  if (isWeaponPrimaryOrSecondary) {
    const sway = playerLocalWeapon?.getWeaponSway
    if (sway) {
      if (sway.isModified) {
        if (sway.isDefaultData()) {
          console.log(color.yellow('[info]: sway reset'))
          sway.isModified = false
        }
      }
  
      if (!sway.isModified) {
        sway.data = [0.4,0.4,0.4,0.4]
        sway.isModified = true
      }
    }
  }

  for (const player of players) {
    if (Utils.isInvalidPtr(player.ptr)) continue
    if (localTeamId === player.teamId) continue

    const spotted = spot(player)
    if (spotted) activeEntities.push(spotted)

    if (playerLocalWeaponName === 'Knife') {
      const soldier = player.soldier
      if (!soldier) continue
      const renderFlags = soldier.renderFlags

      if (renderFlags !== 5) {
        soldier.renderFlags = 5
        soldier.allowRenderTroughWalls = true        
      }

      paintedTargets.push(soldier)
    }
  }

  if (playerLocalWeaponName !== 'Knife') {
    for (let instance = Utils.getFirstInstanceOf('ClientSoldierEntity'); Utils.isValidPtr(instance?.ptr); instance = instance?.nextInstance) {
      if (instance instanceof SoldierEntity) {
        if (painted && instance.ptr.equals(painted.ptr)) continue
  
        if (instance.renderFlags === 5) {
          instance.renderFlags = 0
        }
      }
    }
  }

  if (game.isScreenShotting) {
    screenShotHappening = true
    console.log(color.yellow('[info]: screenshot cleanup'))

    for (const entity of activeEntities) {
      entity.spotType = 'none'
    }

    for (const entity of paintedTargets) {
      if (entity.renderFlags === 5) {
        entity.renderFlags = 0
      }
    }

    if (painted) painted.renderFlags = 0
    continueRender()
    return
  }

  continueRender()
}

setInterval(() => {
  console.log(color.gray('running at', String(benchmarkCount), '/', String(benchmarkCount + skippedFrames), 'fps'))
  benchmarkCount = 0
  skippedFrames = 0

  if (heartBeat + 1000 <= Date.now()) {
    console.log(color.red('[error]: restoring main loop'))
    render()
  }
}, 1000)


render()