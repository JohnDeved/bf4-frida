import { SoldierEntity } from '../Classes/SoldierEntity.js'
import { VehicleEntity } from '../Classes/VehicleEntity.js'
import { Color } from './Color.js'

export class Utils {
  static spottingCache: Record<string, string | null | undefined> = {}
  static classHeadCache: Record<string, string | undefined> = {}
  static classInfoCache: Record<string, NativePointer | undefined> = {}
  static weaponSwayCache: Record<string, [number, number, number, number] | undefined> = {}
  static weaponSwayModifiedCache: Record<string, boolean | undefined> = {}

  static isValidPtr (ptr?: NativePointer): ptr is NativePointer {
    if (!ptr || ptr.isNull()) return false

    try {
      ptr.readU8()
      return true
    } catch {
      return false
    }
  }

  static isInvalidPtr (ptr?: NativePointer): ptr is undefined {
    return !this.isValidPtr(ptr)
  }

  static deepPtr (ptr: NativePointer, offsets: number[]): NativePointer | undefined {
    let currentPtr = ptr

    for (let i = 0; i < offsets.length; i++) {
      currentPtr = currentPtr.add(offsets[i])
      if (i < offsets.length - 1) {
        currentPtr = currentPtr.readPointer()
        if (this.isInvalidPtr(currentPtr)) return
      }
    }

    return currentPtr
  }

  static getClassInfoPtr (headPtr: NativePointer) {
    if (Utils.isInvalidPtr(headPtr)) return

    const classInfoCode = headPtr.readPointer()
    if (Utils.isInvalidPtr(classInfoCode)) return

    const classInfo = classInfoCode.add(classInfoCode.add(0x3).readU32() + 0x7)
    if (Utils.isInvalidPtr(classInfo)) return

    return classInfo
  }

  static getClassNameByHeader (ptr: NativePointer) {
    const headPtr = ptr.readPointer()
    if (Utils.isInvalidPtr(headPtr)) return

    const headPtrAddress = headPtr.toString()
    const cache = this.classHeadCache[headPtrAddress]
    if (cache) return cache

    const classInfo = this.getClassInfoPtr(headPtr)
    if (Utils.isInvalidPtr(classInfo)) return

    const memberInfo = classInfo.readPointer()
    if (Utils.isInvalidPtr(memberInfo)) return

    const className = memberInfo.readPointer().readCString()
    if (!className) return

    console.log(Color.green('[info]: cached headPtr', headPtrAddress, '->', className))
    this.classHeadCache[headPtrAddress] = className

    if (!this.classInfoCache[className]) {
      console.log(Color.green('[info]: cached classInfo', className, '->', classInfo.toString()))
      this.classInfoCache[className] = classInfo
    }

    return className
  }

  static findClassInfoByName (className: string) {
    const cache = this.classInfoCache[className]
    if (cache) return cache

    let counter = 0
    for (let currentClass = ptr(0x1423e41b8).readPointer(); !Utils.isInvalidPtr(currentClass); currentClass = currentClass.add(0x8).readPointer()) {
      const currentMember = currentClass.readPointer()
      if (Utils.isInvalidPtr(currentMember)) continue

      const currentMemberNamePtr = currentMember.readPointer()
      if (Utils.isInvalidPtr(currentMemberNamePtr)) continue

      const currentMemberName = currentMemberNamePtr.readCString()

      if (!currentMemberName) continue
      if (!this.classInfoCache[currentMemberName]) {
        counter++
        this.classInfoCache[currentMemberName] = currentClass
      }

      if (currentMemberName === className) {
        console.log(Color.green('[info]: cached', String(counter), 'classInfo pointers'))
        return currentClass
      }
    }
  }

  static getFirstInstanceOf (className: string) {
    const classInfo = this.findClassInfoByName(className)
    if (Utils.isInvalidPtr(classInfo)) return

    const firstInstancePtr = classInfo.add(0x60).readPointer().sub(0x40)
    if (Utils.isInvalidPtr(firstInstancePtr)) return

    return this.autoEntity(firstInstancePtr)
  }

  static autoEntity (entityPtr?: NativePointer): SoldierEntity | VehicleEntity | undefined {
    if (Utils.isInvalidPtr(entityPtr)) return

    const className = Utils.getClassNameByHeader(entityPtr)

    if (className === 'ClientSoldierEntity') {
      return new SoldierEntity(entityPtr)
    }

    if (className === 'ClientVehicleEntity') {
      return new VehicleEntity(entityPtr)
    }
  }
}
