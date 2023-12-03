// serialize.js: simple interface and utility functions for converting
// Things into a directly serializeable format

// Utility functions

export function id(x) {
  return x;
}

export function toRef(thing) {
  return thing?.constructor.getReference(thing);
}

export function toRefs(things) {
  return things?.map(toRef);
}

export function toContribRefs(contribs) {
  return contribs?.map(({who, what}) => ({who: toRef(who), what}));
}

export function toCommentaryRefs(entries) {
  return entries?.map(({artist, ...props}) => ({artist: toRef(artist), ...props}));
}

// Interface

export const serializeDescriptors = Symbol();

export function serializeThing(thing) {
  const descriptors = thing.constructor[serializeDescriptors];

  if (!descriptors) {
    throw new Error(`Constructor ${thing.constructor.name} does not provide serialize descriptors`);
  }

  return Object.fromEntries(
    Object.entries(descriptors)
      .map(([property, transform]) => [property, transform(thing[property])])
  );
}

export function serializeThings(things) {
  return things.map(serializeThing);
}
