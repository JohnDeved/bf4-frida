import { SpottingEnum } from '../Enums/SpottingEnum.js'
import { Utils } from '../Helper/Utils.js'
import { Vec3 } from '../Helper/Vec3.js'
import { ControllableEntity } from './ControllableEntity.js'
import { Player } from './Player.js'
import { Weapon } from './Weapon.js'

export class SoldierEntity extends ControllableEntity {
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
