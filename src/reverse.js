import * as fr from './find-reverse.js';

import {sortByDate} from '#sort';
import {stitchArrays} from '#sugar';

function checkUnique(value) {
  if (value.length === 0) {
    return null;
  } else if (value.length === 1) {
    return value[0];
  } else {
    throw new Error(
      `Requested unique referencing thing, ` +
      `but ${value.length} reference this`);
  }
}

function reverseHelper(spec) {
  const cache = new WeakMap();

  return (thing, data, {
    unique = false,
  } = {}) => {
    // Check for an existing cache record which corresponds to this data.
    // If it exists, query it for the requested thing, and return that;
    // if it doesn't, create it and put it where it needs to be.

    if (cache.has(data)) {
      const value = cache.get(data).get(thing) ?? [];

      if (unique) {
        return checkUnique(value);
      } else {
        return value;
      }
    }

    const cacheRecord = new WeakMap();
    cache.set(data, cacheRecord);

    // Get the referencing and referenced things. This is the meat of how
    // one reverse spec is different from another. If the spec includes a
    // 'tidy' step, use that to finalize the referencing things, the way
    // they'll be recorded as results.

    const interstitialReferencingThings =
      (spec.bindTo === 'wikiData'
        ? spec.referencing(data)
        : data.flatMap(thing => spec.referencing(thing)));

    const referencedThings =
      interstitialReferencingThings.map(thing => spec.referenced(thing));

    const referencingThings =
      (spec.tidy
        ? interstitialReferencingThings.map(thing => spec.tidy(thing))
        : interstitialReferencingThings);

    // Actually fill in the cache record. Since we're building up a *reverse*
    // reference list, track connections in terms of the referenced thing.
    // Also gather all referenced things into a set, for sorting purposes.

    const allReferencedThings = new Set();

    stitchArrays({
      referencingThing: referencingThings,
      referencedThings: referencedThings,
    }).forEach(({referencingThing, referencedThings}) => {
        for (const referencedThing of referencedThings) {
          if (cacheRecord.has(referencedThing)) {
            cacheRecord.get(referencedThing).push(referencingThing);
          } else {
            cacheRecord.set(referencedThing, [referencingThing]);
            allReferencedThings.add(referencedThing);
          }
        }
      });

    // Sort the entries in the cache records, too, just by date. The rest of
    // sorting should be handled externally - either preceding the reverse
    // call (changing the data input) or following (sorting the output).

    for (const referencedThing of allReferencedThings) {
      if (cacheRecord.has(referencedThing)) {
        const referencingThings = cacheRecord.get(referencedThing);
        sortByDate(referencingThings, {
          getDate: spec.date ?? (thing => thing.date),
        });
      }
    }

    // Then just pluck out the requested thing from the now-filled
    // cache record!

    const value = cacheRecord.get(thing) ?? [];

    if (unique) {
      return checkUnique(value);
    } else {
      return value;
    }
  };
}

const hardcodedReverseSpecs = {};

const findReverseHelperConfig = {
  word: `reverse`,
  constructorKey: Symbol.for('Thing.reverseSpecs'),

  hardcodedSpecs: hardcodedReverseSpecs,
  postprocessSpec: postprocessReverseSpec,
};

export function postprocessReverseSpec(spec, {thingConstructor}) {
  const newSpec = {...spec};

  void thingConstructor;

  return newSpec;
}

export function getAllReverseSpecs() {
  return fr.getAllSpecs(findReverseHelperConfig);
}

export function findReverseSpec(key) {
  return fr.findSpec(key, findReverseHelperConfig);
}

export default fr.tokenProxy({
  findSpec: findReverseSpec,
  prepareBehavior: reverseHelper,
});

export function bindReverse(wikiData, opts) {
  return fr.bind(wikiData, opts, {
    getAllSpecs: getAllReverseSpecs,
    prepareBehavior: reverseHelper,
  });
}
