import { Color } from '../Helper/Color.js'
import { Utils } from '../Helper/Utils.js'

export class WeaponSway {
  constructor (public ptr: NativePointer, private weaponName: string) {
    const cache = Utils.weaponSwayCache[this.weaponName]
    if (cache) return

    Utils.weaponSwayCache[this.weaponName] = this.data
    console.log(Color.green('[info]: cached SwayData', this.weaponName, '->', String(this.data)))
  }

  get isModified () {
    const cache = Utils.weaponSwayModifiedCache[this.weaponName]
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
