// Analogous implementation for withReverseReferenceList, for contributions.
// This is all duplicate code and both should be ported to the same underlying
// data form later on.
//
// This implementation uses a global cache (via WeakMap) to attempt to speed
// up subsequent similar accesses.
//
// This has absolutely not been rigorously tested with altering properties of
// data objects in a wiki data array which is reused. If a new wiki data array
// is used, a fresh cache will always be created.

import {input, templateCompositeFrom} from '#composite';

import {exitWithoutDependency, raiseOutputWithoutDependency}
  from '#composite/control-flow';

import inputWikiData from './inputWikiData.js';

// Mapping of reference list property to WeakMap.
// Each WeakMap maps a wiki data array to another weak map,
// which in turn maps each referenced thing to an array of
// things referencing it.
const caches = new Map();

export default templateCompositeFrom({
  annotation: `withReverseContributionList`,

  inputs: {
    data: inputWikiData({allowMixedTypes: false}),
    list: input({type: 'string'}),
  },

  outputs: ['#reverseContributionList'],

  steps: () => [
    // Early exit with an empty array if the data list isn't available.
    exitWithoutDependency({
      dependency: input('data'),
      value: input.value([]),
    }),

    // Raise an empty array (don't early exit) if the data list is empty.
    raiseOutputWithoutDependency({
      dependency: input('data'),
      mode: input.value('empty'),
      output: input.value({'#reverseContributionList': []}),
    }),

    {
      dependencies: [input.myself(), input('data'), input('list')],

      compute: (continuation, {
        [input.myself()]: myself,
        [input('data')]: data,
        [input('list')]: list,
      }) => {
        if (!caches.has(list)) {
          caches.set(list, new WeakMap());
        }

        const cache = caches.get(list);

        if (!cache.has(data)) {
          const cacheRecord = new WeakMap();

          for (const referencingThing of data) {
            const referenceList = referencingThing[list];

            // Destructuring {artist} is the only unique part of the
            // withReverseContributionList implementation, compared to
            // withReverseReferneceList.
            for (const {artist: referencedThing} of referenceList) {
              if (cacheRecord.has(referencedThing)) {
                cacheRecord.get(referencedThing).push(referencingThing);
              } else {
                cacheRecord.set(referencedThing, [referencingThing]);
              }
            }
          }

          cache.set(data, cacheRecord);
        }

        return continuation({
          ['#reverseContributionList']:
            cache.get(data).get(myself) ?? [],
        });
      },
    },
  ],
});
