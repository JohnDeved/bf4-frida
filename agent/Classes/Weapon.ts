import { Utils } from '../Helper/Utils.js'
import { Vec3 } from '../Helper/Vec3.js'
import { FrostByteClass } from './FrostByteClass.js'
import { WeaponSway } from './WeaponSway.js'

export class Weapon extends FrostByteClass {
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
