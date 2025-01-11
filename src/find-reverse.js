// Helpers common to #find and #reverse logic.

import thingConstructors from '#things';

export function getAllSpecs({
  word,
  constructorKey,

  hardcodedSpecs,
  postprocessSpec,
}) {
  try {
    thingConstructors;
  } catch (error) {
    throw new Error(`Thing constructors aren't ready yet, can't get all ${word} specs`);
  }

  const specs = {...hardcodedSpecs};

  for (const thingConstructor of Object.values(thingConstructors)) {
    const thingSpecs = thingConstructor[constructorKey];
    if (!thingSpecs) continue;

    for (const [key, spec] of Object.entries(thingSpecs)) {
      specs[key] =
        postprocessSpec(spec, {
          thingConstructor,
        });
    }
  }

  return specs;
}

export function findSpec(key, {
  word,
  constructorKey,

  hardcodedSpecs,
  postprocessSpec,
}) {
  if (Object.hasOwn(hardcodedSpecs, key)) {
    return hardcodedSpecs[key];
  }

  try {
    thingConstructors;
  } catch (error) {
    throw new Error(`Thing constructors aren't ready yet, can't check if "${word}.${key}" available`);
  }

  for (const thingConstructor of Object.values(thingConstructors)) {
    const thingSpecs = thingConstructor[constructorKey];
    if (!thingSpecs) continue;

    if (Object.hasOwn(thingSpecs, key)) {
      return postprocessSpec(thingSpecs[key], {
        thingConstructor,
      });
    }
  }

  throw new Error(`"${word}.${key}" isn't available`);
}

export function tokenProxy({
  findSpec,
  prepareBehavior,

  handle: customHandle =
    (_key) => undefined,

  decorate =
    (_token, _key) => {},
}) {
  return new Proxy({}, {
    get: (store, key) => {
      const custom = customHandle(key);
      if (custom !== undefined) {
        return custom;
      }

      if (!Object.hasOwn(store, key)) {
        let behavior = (...args) => {
          // This will error if the spec isn't available...
          const spec = findSpec(key);

          // ...or, if it is available, replace this function with the
          // ready-for-use find function made out of that spec.
          return (behavior = prepareBehavior(spec))(...args);
        };

        store[key] = (...args) => behavior(...args);
        decorate(store[key], key);
      }

      return store[key];
    },
    });
}
