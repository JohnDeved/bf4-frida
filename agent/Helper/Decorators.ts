import { Utils } from './Utils.js'

type ReadMethods = Extract<keyof NativePointer, `read${string}`>
type WriteMethods = Extract<keyof NativePointer, `write${string}`>
type Types = ReadMethods | WriteMethods extends `${'read' | 'write'}${infer R}` ? R : never
interface ClassWithBaseAddr { ptr: NativePointer }
type GetReturnForType<T extends Types> = ReturnType<NativePointer[`read${T}`]>

type Offset<T> = NativePointer | number | ((obj: T, base: NativePointer) => NativePointer | undefined) | keyof {
  [K in keyof T as T[K] extends NativePointer | undefined ? K : never]: T[K]
}
type Offsets<T> = Array<Offset<T>>

function deepPtr<T extends ClassWithBaseAddr> (this: T, offsets: Array<Offset<T>>): NativePointer | undefined {
  let currentPtr = this.ptr

  for (let i = 0; i < offsets.length; i++) {
    const offset = offsets[i]

    // console.log('offset', offset, currentPtr)

    // Check if the offset is a key of T and the corresponding value is a NativePointer
    if (typeof offset === 'string') {
      const res = this[offset] as NativePointer | undefined
      if (!res) return
      currentPtr = res
      continue
    } else if (typeof offset === 'function') {
      // Check if the offset is a function (dynamic offset)
      const res = offset(this, currentPtr) // Pass the `this` context and the current base pointer
      if (!res) return
      currentPtr = res
    } else if (typeof offset === 'number') {
      currentPtr = currentPtr.add(offset) // Static offset
    }

    if (i < offsets.length - 1) {
      if (Utils.isInvalidPtr(currentPtr)) return
      currentPtr = currentPtr.readPointer()
    }
  }

  if (Utils.isInvalidPtr(currentPtr)) return
  return currentPtr
}

export function prop<InferThis extends ClassWithBaseAddr, InferReturnType extends GetReturnForType<InferType>, InferType extends Types, InferOverrideType> (
  offset: Offset<InferThis> | Offsets<InferThis>,
  type: InferType,
  options?: {
    length?: number
    getter?: (value: InferReturnType, obj: InferThis) => InferOverrideType
    setter?: (value: InferOverrideType, obj: InferThis) => InferReturnType
  },
) {
  type ChooseReturnType = [InferOverrideType] extends [undefined] ? InferReturnType | undefined : InferOverrideType | undefined
  return function (
    target: ClassAccessorDecoratorTarget<InferThis, ChooseReturnType>,
    context: ClassAccessorDecoratorContext<InferThis, ChooseReturnType>,
  ): ClassAccessorDecoratorResult<InferThis, ChooseReturnType> {
    return {
      get () {
        const readMethod = `read${type}` as ReadMethods
        if (typeof this.ptr[readMethod] !== 'function') throw new Error(`Read method not found for type ${type}`)

        // Use deepPtr to calculate the final address
        const offsets = Array.isArray(offset) ? offset : [offset]
        const resolvedPtr = deepPtr.call(this as ClassWithBaseAddr, offsets as Offsets<ClassWithBaseAddr>)

        if (!resolvedPtr) return undefined as ChooseReturnType

        const res = resolvedPtr[readMethod](options?.length as 0) as InferReturnType

        if (options?.getter && res) {
          return options.getter(res, this) as ChooseReturnType
        }

        return res as ChooseReturnType
      },
      set (value) {
        const writeMethod = `write${type}` as WriteMethods
        if (typeof this.ptr[writeMethod] !== 'function') throw new Error(`Write method not found for type ${type}`)
        // if getter is defined but not setter, throw an error
        if (options?.getter && !options.setter) throw new Error('Getter is defined but setter is not')

        // Use deepPtr to calculate the final address
        const offsets = Array.isArray(offset) ? offset : [offset]
        const resolvedPtr = deepPtr.call(this as ClassWithBaseAddr, offsets as Offsets<ClassWithBaseAddr>)

        if (!resolvedPtr) return
        resolvedPtr[writeMethod](value as never)
      },
    }
  }
}
