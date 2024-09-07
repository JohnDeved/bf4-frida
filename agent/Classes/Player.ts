import { prop } from '../Helper/Decorators.js'
import { Utils } from '../Helper/Utils.js'
import { SoldierEntity } from './SoldierEntity.js'
import { VehicleEntity } from './VehicleEntity.js'

export class Player {
  constructor (public ptr: NativePointer) { }

  @prop(0x40, 'CString') accessor name: string | undefined
  @prop(0x13CC, 'UInt') accessor teamId: number | undefined
  @prop(0x14D0, 'Pointer') accessor entityPtr: NativePointer | undefined

  get isInVehicle () {
    const entityPtr = this.entityPtr
    if (Utils.isInvalidPtr(entityPtr)) return

    return Utils.getClassNameByHeader(entityPtr) === 'ClientVehicleEntity'
  }

  get isOnFoot () {
    const entityPtr = this.entityPtr
    if (Utils.isInvalidPtr(entityPtr)) return

    return Utils.getClassNameByHeader(entityPtr) === 'ClientSoldierEntity'
  }

  get entity () {
    return this.soldier ?? this.vehicle
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
