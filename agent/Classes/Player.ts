import { Utils } from '../Helper/Utils.js'
import { SoldierEntity } from './SoldierEntity.js'
import { VehicleEntity } from './VehicleEntity.js'

export class Player {
  constructor (public ptr: NativePointer) { }

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
