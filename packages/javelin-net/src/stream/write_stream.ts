import {Buffer, LE} from "./buffer.js"

export class WriteStream {
  #buffer
  #offset
  #initialCapacity

  constructor(initialCapacity = 0) {
    this.#buffer = Buffer.alloc(initialCapacity)
    this.#offset = 0
    this.#initialCapacity = initialCapacity
  }

  get offset() {
    return this.#offset
  }

  get bytes() {
    return this.#buffer.u8.length === this.#offset
      ? this.#buffer.u8
      : this.#buffer.u8.subarray(0, this.#offset)
  }

  reset() {
    Buffer.free(this.#buffer)
    this.#buffer = Buffer.alloc(this.#initialCapacity)
    this.#offset = 0
  }

  grow(growAmount: number) {
    let newSize = this.#offset + growAmount
    if (this.#buffer.u8.length < newSize) {
      let buffer = Buffer.alloc(newSize)
      buffer.u8.set(this.#buffer.u8)
      Buffer.free(this.#buffer)
      this.#buffer = buffer
    }
  }

  writeU8(n: number) {
    let offset = this.#offset
    this.#buffer.dv.setUint8(this.#offset, n)
    this.#offset = offset + 1
    return offset
  }

  writeU32(n: number) {
    let offset = this.#offset
    this.#buffer.dv.setUint32(this.#offset, n, LE)
    this.#offset = offset + 4
    return offset
  }

  writeU32At(n: number, offset: number) {
    this.#buffer.dv.setUint32(offset, n, LE)
  }

  writeF32(n: number) {
    let offset = this.#offset
    this.#buffer.dv.setFloat32(this.#offset, n, LE)
    this.#offset = offset + 4
    return offset
  }

  writeF64(n: number) {
    let offset = this.#offset
    this.#buffer.dv.setFloat64(this.#offset, n, LE)
    this.#offset = offset + 8
    return offset
  }
}
