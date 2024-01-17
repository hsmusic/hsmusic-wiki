// Analogous implementation for withReverseReferenceList, but contributions.
//
// This implementation uses a global cache (via WeakMap) to attempt to speed
// up subsequent similar accesses. Reverse contribution lists are the most
// costly in live-dev-server, but we intend to expand the impelemntation here
// to reverse reference lists in general later on.
//
// This has absolutely not been rigorously tested with altering properties of
// data objects in a wiki data array which is reused. If a new wiki data array
// is used, a fresh cache will always be created.

import {input, templateCompositeFrom} from '#composite';

import {exitWithoutDependency} from '#composite/control-flow';

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
    exitWithoutDependency({
      dependency: input('data'),
      value: input.value([]),
      mode: input.value('empty'),
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
            for (const {who: referencedThing} of referenceList) {
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
