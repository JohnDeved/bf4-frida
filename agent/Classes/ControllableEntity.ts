import { FrostByteClass } from './FrostByteClass.js'
import { Utils } from '../Helper/Utils.js'

export class ControllableEntity extends FrostByteClass {
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
