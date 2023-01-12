import {assert} from "@javelin/lib"
import {HI_MASK, idHi, idLo, makeId} from "./entity.js"
import {makeTagComponent, Component, Tag} from "./component.js"

export interface Relation {
  relationId: number
  relationTerm: Component<Tag>
  (to: number | Relation): Component<Tag>
}

let relationIds = 1
let relations: Relation[] = []

export let makeRelation = (): Relation => {
  let relationId = relationIds++
  let relationTerm = makeTagComponent()
  assert(relationId <= HI_MASK)
  let relationAttrs = {
    relationId: relationId,
    relationTerm: relationTerm,
  }
  function relate(to: number | Relation) {
    return makeId(
      typeof to === "number" ? idLo(to) : to.relationTerm,
      relationId,
    ) as Component<void>
  }
  let relation = Object.assign(
    relate,
    relationAttrs,
  ) as unknown as Relation
  relations[relationId] = relation
  return relation
}

export let getRelation = (relationId: number) => relations[relationId]

export let isRelation = (object: object): object is Relation =>
  "relation_id" in object

export let isRelationship = (term: Component) => idHi(term) > 0

/**
 * Creates a relation pair (entity, relation type) that can be used like a term
 * to create a relationship between two entities.
 * @example <caption>A simple parent-child relationship</caption>
 * let parent = world.make()
 * let child = world.make(type(ChildOf(parent)))
 * @example <caption>Deeply nested children</caption>
 * let a = world.make()
 * let b = world.make(type(ChildOf(a)))
 * let c = world.make(type(ChildOf(b)))
 */
export let ChildOf = makeRelation()
export let Without = makeRelation()
export let Not = Without
