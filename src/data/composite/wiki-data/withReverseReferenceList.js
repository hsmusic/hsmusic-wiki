// Check out the info on reverseReferenceList!
// This is its composable form.
//
// This implementation uses a global cache (via WeakMap) to attempt to speed
// up subsequent similar accesses.
//
// This has absolutely not been rigorously tested with altering properties of
// data objects in a wiki data array which is reused. If a new wiki data array
// is used, a fresh cache will always be created.
//
// Note that this implementation is mirrored in withReverseContributionList,
// so any changes should be reflected there (until these are combined).

import {input, templateCompositeFrom} from '#composite';
import {sortByDate} from '#sort';
import {stitchArrays} from '#sugar';

import {exitWithoutDependency, raiseOutputWithoutDependency}
  from '#composite/control-flow';
import {withMappedList} from '#composite/data';

import inputWikiData from './inputWikiData.js';

// Mapping of reference list property to WeakMap.
// Each WeakMap maps a wiki data array to another weak map,
// which in turn maps each referenced thing to an array of
// things referencing it.
const caches = new Map();

export default templateCompositeFrom({
  annotation: `withReverseReferenceList`,

  inputs: {
    data: inputWikiData({allowMixedTypes: false}),
    list: input({type: 'string'}),
  },

  outputs: ['#reverseReferenceList'],

  steps: () => [
    // Common behavior --

    // Early exit with an empty array if the data list isn't available.
    exitWithoutDependency({
      dependency: input('data'),
      value: input.value([]),
    }),

    // Raise an empty array (don't early exit) if the data list is empty.
    raiseOutputWithoutDependency({
      dependency: input('data'),
      mode: input.value('empty'),
      output: input.value({'#reverseReferenceList': []}),
    }),

    // Check for an existing cache record which corresponds to this
    // input('list') and input('data'). If it exists, query it for the
    // current thing, and raise that; if it doesn't, create it, put it
    // where it needs to be, and provide it so the next steps can fill
    // it in.
    {
      dependencies: [input('list'), input('data'), input.myself()],

      compute: (continuation, {
        [input('list')]: list,
        [input('data')]: data,
        [input.myself()]: myself,
      }) => {
        if (!caches.has(list)) {
          const cache = new WeakMap();
          caches.set(list, cache);

          const cacheRecord = new WeakMap();
          cache.set(data, cacheRecord);

          return continuation({
            ['#cacheRecord']: cacheRecord,
          });
        }

        const cache = caches.get(list);

        if (!cache.has(data)) {
          const cacheRecord = new WeakMap();
          cache.set(data, cacheRecord);

          return continuation({
            ['#cacheRecord']: cacheRecord,
          });
        }

        return continuation.raiseOutput({
          ['#reverseReferenceList']:
            cache.get(data).get(myself) ?? [],
        });
      },
    },

    // Unique behavior for reference lists --

    {
      dependencies: [input('list')],
      compute: (continuation, {
        [input('list')]: list,
      }) => continuation({
        ['#referenceMap']:
          thing => thing[list],
      }),
    },

    withMappedList({
      list: input('data'),
      map: '#referenceMap',
    }).outputs({
      '#mappedList': '#referencedThings',
    }),

    {
      dependencies: [input('data')],
      compute: (continuation, {
        [input('data')]: data,
      }) => continuation({
        ['#referencingThings']:
          data,
      }),
    },

    // Common behavior --

    // Actually fill in the cache record. Since we're building up a *reverse*
    // reference list, track connections in terms of the referenced thing.
    // Although we gather all referenced things into a set and provide that
    // for sorting purposes in the next step, we *don't* reprovide the cache
    // record, because we're mutating that in-place - we'll just reuse its
    // existing '#cacheRecord' dependency.
    {
      dependencies: ['#cacheRecord', '#referencingThings', '#referencedThings'],
      compute: (continuation, {
        ['#cacheRecord']: cacheRecord,
        ['#referencingThings']: referencingThings,
        ['#referencedThings']: referencedThings,
      }) => {
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

        return continuation({
          ['#allReferencedThings']:
            allReferencedThings,
        });
      },
    },

    // Sort the entries in the cache records, too, just by date - the rest of
    // sorting should be handled outside of withReverseContributionList, either
    // preceding (changing the 'data' input) or following (sorting the output).
    // Again we're mutating in place, so no need to reprovide '#cacheRecord'
    // here.
    {
      dependencies: ['#cacheRecord', '#allReferencedThings'],
      compute: (continuation, {
        ['#cacheRecord']: cacheRecord,
        ['#allReferencedThings']: allReferencedThings,
      }) => {
        for (const referencedThing of allReferencedThings) {
          if (cacheRecord.has(referencedThing)) {
            const referencingThings = cacheRecord.get(referencedThing);
            sortByDate(referencingThings);
          }
        }

        return continuation();
      },
    },

    // Then just pluck out the current object from the now-filled cache record!
    {
      dependencies: ['#cacheRecord', input.myself()],
      compute: (continuation, {
        ['#cacheRecord']: cacheRecord,
        [input.myself()]: myself,
      }) => continuation({
        ['#reverseReferenceList']:
          cacheRecord.get(myself) ?? [],
      }),
    },
  ],
});
