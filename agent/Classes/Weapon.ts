import { prop } from '../Helper/Decorators.js'
import { Utils } from '../Helper/Utils.js'
import { Vec3 } from '../Helper/Vec3.js'
import { FrostByteClass } from './FrostByteClass.js'
import { WeaponSway } from './WeaponSway.js'

export class Weapon extends FrostByteClass {
  @prop(0x890, 'Pointer') accessor handler: NativePointer | undefined
  @prop(0xA98, 'U32') accessor activeSlot: number | undefined

  @prop(({ handler, activeSlot }) => {
    if (activeSlot !== undefined) return handler?.add(activeSlot * 0x8)
  }, 'Pointer') accessor weaponPtr: NativePointer | undefined

  @prop(['weaponPtr', 0x30, 0x130, 0x0], 'CString') accessor name: string | undefined

  @prop(['weaponPtr', 0x49C0, 0x1A0], 'U32') accessor bulletsInMagazine: number | undefined
  @prop(['weaponPtr', 0x49C0, 0x1A4], 'U32') accessor bulletsInReserve: number | undefined
  @prop(['weaponPtr', 0x49C0, 0x78], 'Pointer') accessor weaponSwayPtr: NativePointer | undefined
  @prop(['weaponPtr', 0x49C0, 0x78], 'Pointer', {
    getter: (res, { name }) => {
      if (name) return new WeaponSway(res, name)
    },
  }) accessor getWeaponSway: WeaponSway | undefined

  @prop(['weaponPtr', 0x4988, 0x160], 'Pointer', { getter: (res) => new Vec3(res) }) accessor targetPos: Vec3 | undefined
  @prop(['weaponPtr', 0x4988, 0x158], 'Pointer', { getter: (res) => Utils.autoEntity(res) })
  accessor targetEntity: ReturnType<typeof Utils.autoEntity>

  isPrimaryOrSecondary () {
    const activeSlot = this.activeSlot
    if (typeof activeSlot === 'undefined') return
    if (activeSlot === 0 || activeSlot === 1) return true
  }
}
