// Controls how find.track works - it'll never be matched by a reference
// just to the track's name, which means you don't have to always reference
// some *other* (much more commonly referenced) track by directory instead
// of more naturally by name.
//
// See the implementation for an important caveat about matching the original
// track against other tracks, which uses a custom implementation pulling (and
// duplicating) details from #find instead of using withOriginalRelease and the
// usual withResolvedReference / find.track() utilities.
//

import {input, templateCompositeFrom} from '#composite';
import {isBoolean} from '#validators';

import {exitWithoutDependency, exposeUpdateValueOrContinue}
  from '#composite/control-flow';
import {withPropertyFromObject} from '#composite/data';

// TODO: Kludge. (The usage of this, not so much the import.)
import CacheableObject from '../../../things/cacheable-object.js';

export default templateCompositeFrom({
  annotation: `withAlwaysReferenceByDirectory`,

  outputs: ['#alwaysReferenceByDirectory'],

  steps: () => [
    exposeUpdateValueOrContinue({
      validate: input.value(isBoolean),
    }),

    // Remaining code is for defaulting to true if this track is a rerelease of
    // another with the same name, so everything further depends on access to
    // trackData as well as originalReleaseTrack.

    exitWithoutDependency({
      dependency: 'trackData',
      mode: input.value('empty'),
      value: input.value(false),
    }),

    exitWithoutDependency({
      dependency: 'originalReleaseTrack',
      value: input.value(false),
    }),

    // "Slow" / uncached, manual search from trackData (with this track
    // excluded). Otherwise there end up being pretty bad recursion issues
    // (track1.alwaysReferencedByDirectory depends on searching through data
    // including track2, which depends on evaluating track2.alwaysReferenced-
    // ByDirectory, which depends on searcing through data including track1...)
    // That said, this is 100% a kludge, since it involves duplicating find
    // logic on a completely unrelated context.
    {
      dependencies: [input.myself(), 'trackData', 'originalReleaseTrack'],
      compute(continuation, {
        [input.myself()]: thisTrack,
        ['trackData']: trackData,
        ['originalReleaseTrack']: ref,
      }) {
        let originalRelease;

        if (ref.startsWith('track:')) {
          const refDirectory = ref.slice('track:'.length);
          originalRelease =
            trackData.find(track => track.directory === refDirectory);
        } else {
          const refName = ref.toLowerCase();
          originalRelease =
            trackData.find(track =>
              track.name.toLowerCase() === refName &&
              track !== thisTrack &&
              !CacheableObject.getUpdateValue(track, 'originalReleaseTrack'));
        }

        return continuation({['#originalRelease']: originalRelease});
      },
    },

    exitWithoutDependency({
      dependency: '#originalRelease',
      value: input.value(false),
    }),

    withPropertyFromObject({
      object: '#originalRelease',
      property: input.value('name'),
    }),

    {
      dependencies: ['name', '#originalRelease.name'],
      compute: (continuation, {
        name,
        ['#originalRelease.name']: originalName,
      }) => continuation({
        ['#alwaysReferenceByDirectory']: name === originalName,
      }),
    },
  ],
});
