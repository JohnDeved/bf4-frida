import { SpottingEnum } from '../Enums/SpottingEnum.js'
import { Color } from '../Helper/Color.js'
import { prop } from '../Helper/Decorators.js'
import { Utils } from '../Helper/Utils.js'
import { ControllableEntity } from './ControllableEntity.js'

export class VehicleEntity extends ControllableEntity {
  private findSpottingOffset (path: string) {
    if (Utils.spottingCache[path] === null) return
    for (let index = 0x510; index <= 0xD80; index += 0x8) {
      try {
        if (Utils.isInvalidPtr(this.ptr)) continue

        const checkPtr = this.ptr.add(index).readPointer()
        if (Utils.isInvalidPtr(checkPtr)) continue

        if (Utils.getClassNameByHeader(checkPtr) === 'ClientSpottingTargetComponent') {
          if (this.path !== path) {
            console.log(Color.red('[error]: vehicle class did not match'))
            return
          }

          const offsetHex = index.toString(16)
          console.log(Color.green('[info]: offset for', path, 'found at', offsetHex))
          Utils.spottingCache[path] = `0x${offsetHex}`
          return Utils.spottingCache[path]
        }
      } catch (e) {
        continue
      }
    }
    Utils.spottingCache[path] = null
    console.log(Color.red('[error]: offset not found for', path))
  }

  private getSpottingOffsetCache () {
    const path = this.path
    if (!path) return
    let offset = Utils.spottingCache[path]
    if (!offset) offset = this.findSpottingOffset(path)
    return offset
  }

  @prop([0x30, 0xF0, 0x0], 'CString') accessor vehicleName: string | undefined
  @prop([0x30, 0x130, 0x0], 'CString') accessor path: string | undefined

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
