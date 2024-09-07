
import { Utils } from '../Helper/Utils.js'
import type { SoldierEntity } from './SoldierEntity.js'
import type { VehicleEntity } from './VehicleEntity.js'

export class FrostByteClass {
  constructor (public ptr: NativePointer) { }

  get className () {
    return Utils.getClassNameByHeader(this.ptr)
  }

  get nextInstance (): SoldierEntity | VehicleEntity | undefined {
    const nextInstancePtr = this.ptr.add(0x40).readPointer().sub(0x40)
    if (Utils.isInvalidPtr(nextInstancePtr)) return

    return Utils.autoEntity(nextInstancePtr)
  }
}
