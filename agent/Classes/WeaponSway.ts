import { Color } from '../Helper/Color.js'
import { prop } from '../Helper/Decorators.js'
import { Utils } from '../Helper/Utils.js'

export class WeaponSway {
  constructor (public ptr: NativePointer, private weaponName: string) {
    const cache = Utils.weaponSwayCache[this.weaponName]
    if (cache) return

    Utils.weaponSwayCache[this.weaponName] = this.data
    console.log(Color.green('[info]: cached SwayData', this.weaponName, '->', String(this.data)))
  }

  @prop([0x8, 0x430], 'Float') accessor deviationZoom: number | undefined
  @prop([0x8, 0x434], 'Float') accessor gameplayDeviationZoom: number | undefined
  @prop([0x8, 0x438], 'Float') accessor deviationNoZoom: number | undefined
  @prop([0x8, 0x43C], 'Float') accessor gameplayDeviationNoZoom: number | undefined

  get isModified () {
    const cache = Utils.weaponSwayModifiedCache[this.weaponName]
    if (cache) return cache

    Utils.weaponSwayModifiedCache[this.weaponName] = false
    return false
  }

  set isModified (value: boolean) {
    Utils.weaponSwayModifiedCache[this.weaponName] = value
  }

  get data (): [number, number, number, number] {
    return [
      this.deviationZoom ?? 1,
      this.gameplayDeviationZoom ?? 1,
      this.deviationNoZoom ?? 1,
      this.gameplayDeviationNoZoom ?? 1,
    ]
  }

  set data (value: [number, number, number, number]) {
    console.log(Color.green('[info]: setting SwayData', this.weaponName, '->', String(value)))
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
