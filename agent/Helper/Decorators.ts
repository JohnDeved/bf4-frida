import { Utils } from './Utils.js'

type ReadMethods = Extract<keyof NativePointer, `read${string}`>
type WriteMethods = Extract<keyof NativePointer, `write${string}`>
type Types = ReadMethods | WriteMethods extends `${'read' | 'write'}${infer R}` ? R : never
type WriteParams = { [K in WriteMethods]: Parameters<NativePointer[K]>[0] }[WriteMethods]
type ReadReturns = { [K in ReadMethods]: ReturnType<NativePointer[K]> }[ReadMethods]
interface ClassWithBaseAddr { ptr: NativePointer }
type GetReturnForType<T extends Types> = ReturnType<NativePointer[`read${T}`]>

export function prop<T extends ClassWithBaseAddr, V extends GetReturnForType<X>, X extends Types> (
  offset: number | number[],
  type: X,
) {
  return function (
    target: ClassAccessorDecoratorTarget<T, V>,
    context: ClassAccessorDecoratorContext<T, V>,
    length?: number,
  ) {
    // Define the property
    Object.defineProperty(target, context.name, {
      get () {
        const readMethod = `read${type}` as ReadMethods
        if (typeof this.ptr[readMethod] !== 'function') throw new Error(`Read method not found for type ${type}`)

        const addr = Utils.deepPtr(this.ptr, Array.isArray(offset) ? offset : [offset])
        if (!addr) return

        const readFnc = addr[readMethod] as (length?: number) => ReadReturns
        return readFnc(length)
      },
      set (value: WriteParams) {
        const writeMethod = `write${type}` as WriteMethods
        if (typeof this.ptr[writeMethod] !== 'function') throw new Error(`Write method not found for type ${type}`)

        const addr = Utils.deepPtr(this.ptr, Array.isArray(offset) ? offset : [offset])
        if (!addr) return

        const writeFnc = addr[writeMethod] as (value: WriteParams) => void
        writeFnc(value)
      },
    })
  }
}
