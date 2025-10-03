// Resolves this track's `mainRelease` reference, using weird-ass atypical
// machinery that operates on soupyFind and does not operate on findMixed,
// let alone a prim and proper standalone find spec.
//
// Raises null only if there is no `mainRelease` reference provided at all.
// This will early exit (with notFoundValue) if the reference doesn't resolve.
//

import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {withPropertyFromObject} from '#composite/data';
import {withResolvedReference} from '#composite/wiki-data';
import {soupyFind} from '#composite/wiki-properties';

export default templateCompositeFrom({
  annotation: `withMainRelease`,

  inputs: {
    from: input({
      defaultDependency: 'mainRelease',
      acceptsNull: true,
    }),

    notFoundValue: input({defaultValue: null}),
  },

  outputs: ['#mainRelease'],

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: input('from'),
      output: input.value({'#mainRelease': null}),
    }),

    {
      dependencies: [input('from'), 'name'],
      compute: (continuation, {
        [input('from')]: ref,
        ['name']: ownName,
      }) =>
        (ref === 'same name single'
          ? continuation({
              ['#albumOrTrackReference']: null,
              ['#sameNameSingleReference']: ownName,
            })
          : continuation({
              ['#albumOrTrackReference']: ref,
              ['#sameNameSingleReference']: null,
            })),
    },

    withResolvedReference({
      ref: '#albumOrTrackReference',
      find: soupyFind.input('trackMainReleasesOnly'),
    }).outputs({
      '#resolvedReference': '#matchingTrack',
    }),

    withResolvedReference({
      ref: '#albumOrTrackReference',
      find: soupyFind.input('album'),
    }).outputs({
      '#resolvedReference': '#matchingAlbum',
    }),

    withResolvedReference({
      ref: '#sameNameSingleReference',
      find: soupyFind.input('albumSinglesOnly'),
    }).outputs({
      '#resolvedReference': '#sameNameSingle',
    }),

    {
      dependencies: ['#sameNameSingle'],
      compute: (continuation, {
        ['#sameNameSingle']: sameNameSingle,
      }) =>
        (sameNameSingle
          ? continuation.raiseOutput({
              ['#mainRelease']:
                sameNameSingle,
            })
          : continuation()),
    },

    {
      dependencies: [
        '#matchingTrack',
        '#matchingAlbum',
        input('notFoundValue'),
      ],

      compute: (continuation, {
        ['#matchingTrack']: matchingTrack,
        ['#matchingAlbum']: matchingAlbum,
        [input('notFoundValue')]: notFoundValue,
      }) =>
        (matchingTrack && matchingAlbum
          ? continuation()
       : matchingTrack ?? matchingAlbum
          ? continuation.raiseOutput({
              ['#mainRelease']:
                matchingTrack ?? matchingAlbum,
            })
          : continuation.exit(notFoundValue)),
    },

    withPropertyFromObject({
      object: '#matchingAlbum',
      property: input.value('tracks'),
    }),

    {
      dependencies: [
        '#matchingAlbum.tracks',
        '#matchingTrack',
        input('notFoundValue'),
      ],

      compute: (continuation, {
        ['#matchingAlbum.tracks']: matchingAlbumTracks,
        ['#matchingTrack']: matchingTrack,
        [input('notFoundValue')]: notFoundValue,
      }) =>
        (matchingAlbumTracks.includes(matchingTrack)
          ? continuation.raiseOutput({'#mainRelease': matchingTrack})
          : continuation.exit(notFoundValue)),
    },
  ],
});
