export class Vec3 {
  constructor (public ptr: NativePointer) { }

  get x () {
    return this.ptr.readFloat()
  }

  get y () {
    return this.ptr.add(0x4).readFloat()
  }

  get z () {
    return this.ptr.add(0x8).readFloat()
  }

  toArray (): [x: number, y: number, z: number] {
    return [this.x, this.y, this.z]
  }

  toString () {
    return `[${this.x}, ${this.y}, ${this.z}]`
  }
}
