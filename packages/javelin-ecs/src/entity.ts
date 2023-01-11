import {Opaque} from "@javelin/lib"

declare const Entity: unique symbol
export type Entity = Opaque<number, typeof Entity>

export const LO_EXTENT = 20
export const LO_MASK = (1 << LO_EXTENT) - 1
export const HI_EXTENT = 31 - LO_EXTENT
export const HI_MASK = (1 << HI_EXTENT) - 1

export let makeId = (lo: number, hi: number) =>
  ((hi & HI_MASK) << LO_EXTENT) | lo
export let idLo = (id: number) => id & LO_MASK
export let idHi = (id: number) => id >> LO_EXTENT
