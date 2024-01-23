// Atomic implementation for reverseReferenceList.
//
// Expects these input token shapes:
//  - data: a string dependency name
//  - list: input.value(a string)
//
// Embeds behavior of:
//  - reverseReferenceList
//  - withReverseReferenceList
//

import {getInputTokenValue} from '#composite';
import {empty} from '#sugar';

/* ref: withReverseReferenceList */
const caches = new Map();

export default function({
  data: dataToken,
  list: listToken,
}) {
  /* ref: reverseReferenceList */
  const dataProperty = dataToken;
  const refListProperty = getInputTokenValue(listToken);

  return {
    flags: {update: false, expose: true, compose: true},

    expose: {
      dependencies: ['this', dataProperty],

      compute({this: myself, [dataProperty]: data}) {
        /* ref: withReverseReferenceList step #1 (exitWithoutDependency) */
        if (data === undefined || empty(data)) {
          return [];
        }

        /* ref: withReverseReferenceList step #2 (custom) */

        const list = refListProperty;

        if (!caches.has(list)) {
          caches.set(list, new WeakMap());
        }

        const cache = caches.get(list);

        if (!cache.has(data)) {
          const cacheRecord = new WeakMap();

          for (const referencingThing of data) {
            const referenceList = referencingThing[list];
            for (const referencedThing of referenceList) {
              if (cacheRecord.has(referencedThing)) {
                cacheRecord.get(referencedThing).push(referencingThing);
              } else {
                cacheRecord.set(referencedThing, [referencingThing]);
              }
            }
          }

          cache.set(data, cacheRecord);
        }

        return cache.get(data).get(myself) ?? [];
      },
    }
  };
}
