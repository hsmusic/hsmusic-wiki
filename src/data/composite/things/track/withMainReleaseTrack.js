// Just provides the main release of this track as a dependency.
// If this track isn't a secondary release, then it'll provide null, unless
// the {selfIfMain} option is set, in which case it'll provide this track
// itself. This will early exit (with notFoundValue) if the main release
// is specified by reference and that reference doesn't resolve to anything.

import {input, templateCompositeFrom} from '#composite';
import {onlyItem} from '#sugar';
import {getKebabCase} from '#wiki-data';

import {exitWithoutDependency, withResultOfAvailabilityCheck}
  from '#composite/control-flow';

import {
  withFilteredList,
  withMappedList,
  withPropertyFromList,
  withPropertyFromObject,
} from '#composite/data';

import withMainRelease from './withMainRelease.js';

export default templateCompositeFrom({
  annotation: `withMainReleaseTrack`,

  inputs: {
    selfIfMain: input({type: 'boolean', defaultValue: false}),
    notFoundValue: input({defaultValue: null}),
  },

  outputs: ['#mainReleaseTrack'],

  steps: () => [
    withResultOfAvailabilityCheck({
      from: 'mainRelease',
    }),

    {
      dependencies: [
        input.myself(),
        input('selfIfMain'),
        '#availability',
      ],

      compute: (continuation, {
        [input.myself()]: track,
        [input('selfIfMain')]: selfIfMain,
        '#availability': availability,
      }) =>
        (availability
          ? continuation()
          : continuation.raiseOutput({
              ['#mainReleaseTrack']:
                (selfIfMain ? track : null),
            })),
    },

    withMainRelease(),

    exitWithoutDependency({
      dependency: '#mainRelease',
      value: input('notFoundValue'),
    }),

    withPropertyFromObject({
      object: '#mainRelease',
      property: input.value('isTrack'),
    }),

    {
      dependencies: ['#mainRelease', '#mainRelease.isTrack'],

      compute: (continuation, {
        ['#mainRelease']: mainRelease,
        ['#mainRelease.isTrack']: mainReleaseIsTrack,
      }) =>
        (mainReleaseIsTrack
          ? continuation.raiseOutput({
              ['#mainReleaseTrack']: mainRelease,
            })
          : continuation()),
    },

    {
      dependencies: ['name', 'directory'],
      compute: (continuation, {
        ['name']: ownName,
        ['directory']: ownDirectory,
      }) => {
        const ownNameKebabed = getKebabCase(ownName);

        return continuation({
          ['#mapItsNameLikeName']:
            name => getKebabCase(name) === ownNameKebabed,

          ['#mapItsDirectoryLikeDirectory']:
            (ownDirectory
              ? directory => directory === ownDirectory
              : () => false),

          ['#mapItsNameLikeDirectory']:
            (ownDirectory
              ? name => getKebabCase(name) === ownDirectory
              : () => false),

          ['#mapItsDirectoryLikeName']:
            directory => directory === ownNameKebabed,
        });
      },
    },

    withPropertyFromObject({
      object: '#mainRelease',
      property: input.value('tracks'),
    }),

    withPropertyFromList({
      list: '#mainRelease.tracks',
      property: input.value('name'),
    }),

    withPropertyFromList({
      list: '#mainRelease.tracks',
      property: input.value('directory'),
      internal: input.value(true),
    }),

    withMappedList({
      list: '#mainRelease.tracks.name',
      map: '#mapItsNameLikeName',
    }).outputs({
      '#mappedList': '#filterItsNameLikeName',
    }),

    withMappedList({
      list: '#mainRelease.tracks.directory',
      map: '#mapItsDirectoryLikeDirectory',
    }).outputs({
      '#mappedList': '#filterItsDirectoryLikeDirectory',
    }),

    withMappedList({
      list: '#mainRelease.tracks.name',
      map: '#mapItsNameLikeDirectory',
    }).outputs({
      '#mappedList': '#filterItsNameLikeDirectory',
    }),

    withMappedList({
      list: '#mainRelease.tracks.directory',
      map: '#mapItsDirectoryLikeName',
    }).outputs({
      '#mappedList': '#filterItsDirectoryLikeName',
    }),

    withFilteredList({
      list: '#mainRelease.tracks',
      filter: '#filterItsNameLikeName',
    }).outputs({
      '#filteredList': '#matchingItsNameLikeName',
    }),

    withFilteredList({
      list: '#mainRelease.tracks',
      filter: '#filterItsDirectoryLikeDirectory',
    }).outputs({
      '#filteredList': '#matchingItsDirectoryLikeDirectory',
    }),

    withFilteredList({
      list: '#mainRelease.tracks',
      filter: '#filterItsNameLikeDirectory',
    }).outputs({
      '#filteredList': '#matchingItsNameLikeDirectory',
    }),

    withFilteredList({
      list: '#mainRelease.tracks',
      filter: '#filterItsDirectoryLikeName',
    }).outputs({
      '#filteredList': '#matchingItsDirectoryLikeName',
    }),

    {
      dependencies: [
        '#matchingItsNameLikeName',
        '#matchingItsDirectoryLikeDirectory',
        '#matchingItsNameLikeDirectory',
        '#matchingItsDirectoryLikeName',
      ],

      compute: (continuation, {
        ['#matchingItsNameLikeName']:           NLN,
        ['#matchingItsDirectoryLikeDirectory']: DLD,
        ['#matchingItsNameLikeDirectory']:      NLD,
        ['#matchingItsDirectoryLikeName']:      DLN,
      }) => continuation({
        ['#mainReleaseTrack']:
          onlyItem(DLD) ??
          onlyItem(NLN) ??
          onlyItem(DLN) ??
          onlyItem(NLD) ??
          null,
      }),
    },
  ],
});
