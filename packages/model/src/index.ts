export enum DataTypeId {
  Number,
  Boolean,
  String,
  Array,
  Map,
}

export type DataType<I extends DataTypeId = DataTypeId> = { __data_type__: I }
export type DataTypeNumber = DataType<DataTypeId.Number> & {
  defaultValue: number
}
export type DataTypeString = DataType<DataTypeId.String> & {
  defaultValue: string
}
export type DataTypeBoolean = DataType<DataTypeId.Boolean> & {
  defaultValue: boolean
}
export type DataTypePrimitive =
  | DataTypeNumber
  | DataTypeString
  | DataTypeBoolean
export type DataTypeArray<E extends SchemaKey> = DataType<DataTypeId.Array> & {
  element: E
}
export type DataTypeMap<E extends SchemaKey> = DataType<DataTypeId.Map> & {
  element: E
}

export const number: DataTypeNumber = {
  __data_type__: DataTypeId.Number,
  defaultValue: 0,
}
export const string: DataTypeString = {
  __data_type__: DataTypeId.String,
  defaultValue: "",
}
export const boolean: DataTypeBoolean = {
  __data_type__: DataTypeId.Boolean,
  defaultValue: false,
}
export const arrayOf = <E extends SchemaKey>(element: E): DataTypeArray<E> => ({
  __data_type__: DataTypeId.Array,
  element,
})
export const mapOf = <E extends SchemaKey>(element: E): DataTypeMap<E> => ({
  __data_type__: DataTypeId.Map,
  element,
})

export type AnyDataType =
  | DataTypeNumber
  | DataTypeString
  | DataTypeBoolean
  | DataTypeArray<any>
  | DataTypeMap<any>

export type SchemaKey = AnyDataType | Schema
export type Schema = { [key: string]: SchemaKey }

export type InstanceOfSchema<S extends Schema> = {
  [K in keyof S]: S[K] extends DataTypeArray<infer T>
    ? InstanceOfElement<T>[] // array
    : S[K] extends DataTypeMap<infer T>
    ? Record<string, InstanceOfElement<T>> // map
    : InstanceOfElement<S[K]> // everything else
}
export type InstanceOfElement<W extends SchemaKey> = W extends DataTypePrimitive
  ? W["defaultValue"]
  : W extends Schema
  ? InstanceOfSchema<W>
  : never

export const isDataType = (object: object): object is DataType =>
  "__data_type__" in object

export type Model = Map<number, Schema>
export enum ModelCollatedNodeKind {
  Primitive,
  Struct,
  Array,
  Map,
}
export type ModelCollatedNodeBase = {
  id: number
  lo: number
  hi: number
  key: string
  kind: ModelCollatedNodeKind
}
export type ModelCollatedField = ModelCollatedNodeBase & {
  type: DataType
}
export type ModelCollatedStruct = ModelCollatedNodeBase & {
  edges: ModelCollatedNode[]
}
export type ModelCollatedNode = ModelCollatedStruct | ModelCollatedField
export type ModelCollated = { [typeId: number]: ModelCollatedNode }

const localeCompare = (a: string, b: string) => a.localeCompare(b)

export const collateSchema = (
  schema: Schema,
  target: ModelCollatedStruct,
  ids = 0,
) => {
  // alphabetically sort keys since we can't guarantee order
  const keys = Object.keys(schema).sort(localeCompare)

  for (let i = 0; i < keys.length; i++) {
    const id = ++ids
    const key = keys[i]
    const value = schema[key]
    const base: ModelCollatedNodeBase = {
      id,
      key,
      lo: id,
      hi: -1,
      kind: ModelCollatedNodeKind.Primitive,
    }

    let record: ModelCollatedNode

    if (isDataType(value)) {
      switch (value.__data_type__) {
        case DataTypeId.Array:
        case DataTypeId.Map: {
          const kind =
            value.__data_type__ === DataTypeId.Array
              ? ModelCollatedNodeKind.Array
              : ModelCollatedNodeKind.Map
          if (isDataType(value.element)) {
            record = { ...base, hi: id, type: value.element, kind }
            // TODO: support nested arrays/maps, e.g.
            // arrayOf(arrayOf(number))
          } else {
            record = { ...base, edges: [], kind }
            ids = collateSchema(value.element, record, ids)
          }
          break
        }
        default:
          record = {
            ...base,
            hi: id,
            type: value,
          }
      }
    } else {
      record = { ...base, edges: [], kind: ModelCollatedNodeKind.Struct }
      ids = collateSchema(value, record, ids)
    }
    target.edges.push(record)
  }

  target.hi = ids

  return ids
}

const getModelRoot = (): ModelCollatedStruct => ({
  key: "",
  edges: [],
  id: 0,
  lo: 1,
  hi: Infinity,
  kind: ModelCollatedNodeKind.Struct,
})

/**
 * collate() produces a graph from a model and assigns each writable field
 * with a unique integer id.
 *
 * @param model
 * @returns ModelCollated
 */
export const collate = (model: Model): ModelCollated => {
  const collated: ModelCollated = {}
  model.forEach((schema, typeId) => {
    const root = getModelRoot()
    collateSchema(schema, root)
    collated[typeId] = root
  })
  return collated
}

/**
 * patch() provides the means to update a schema instance (e.g. ECS component)
 * using a compressed patch.
 *
 * @param model
 * @param typeId
 * @param fieldId
 * @param instance
 * @param traverse
 * @param callback
 * @returns
 */
export const patch = (
  model: ModelCollated,
  typeId: number,
  fieldId: number,
  instance: any,
  traverse: number[] | string[],
  callback: (target: any, key: any) => unknown,
) => {
  const root = model[typeId] as ModelCollatedStruct

  let t = 0
  let current: any = instance
  let record: ModelCollatedStruct = root

  let i = 0
  let node: ModelCollatedNode

  while ((node = record.edges[i])) {
    const { id, key, lo, hi, kind } = node

    if (fieldId === id) {
      callback(current, key)
      return
    }

    if (lo <= fieldId && hi >= fieldId) {
      if (
        kind === ModelCollatedNodeKind.Array ||
        kind === ModelCollatedNodeKind.Map
      ) {
        current = current[key][traverse[t++]]
      } else {
        current = current[key]
      }
      record = node as ModelCollatedStruct
      i = 0
    } else {
      i++
    }
  }

  throw new Error("Failed to patch object: key not found")
}
