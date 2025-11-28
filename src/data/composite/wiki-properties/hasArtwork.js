import {input, templateCompositeFrom, V} from '#composite';
import {isContributionList, isThing, strictArrayOf} from '#validators';

import {fillMissingListItems, withFlattenedList, withPropertyFromList}
  from '#composite/data';

import {
  exitWithoutDependency,
  exposeWhetherDependencyAvailable,
  withResultOfAvailabilityCheck,
} from '#composite/control-flow';

export default templateCompositeFrom({
  annotation: 'hasArtwork',

  inputs: {
    contribs: input({
      validate: isContributionList,
      defaultValue: null,
    }),

    artwork: input({
      validate: isThing,
      defaultValue: null,
    }),

    artworks: input({
      validate: strictArrayOf(isThing),
      defaultValue: null,
    }),
  },

  compose: false,

  steps: () => [
    withResultOfAvailabilityCheck({
      from: input('contribs'),
      mode: input.value('empty'),
    }),

    {
      dependencies: ['#availability'],
      compute: (continuation, {
        ['#availability']: availability,
      }) =>
        (availability
          ? true
          : continuation()),
    },

    {
      dependencies: [input('artwork'), input('artworks')],
      compute: (continuation, {
        [input('artwork')]: artwork,
        [input('artworks')]: artworks,
      }) =>
        continuation({
          ['#artworks']:
            (artwork && artworks
              ? [artwork, ...artworks]
           : artwork
              ? [artwork]
           : artworks
              ? artworks
              : []),
        }),
    },

    exitWithoutDependency('#artworks', {
      value: input.value(false),
      mode: input.value('empty'),
    }),

    withPropertyFromList('#artworks', {
      property: input.value('artistContribs'),
      internal: input.value(true),
    }),

    // Since we're getting the update value for each artwork's artistContribs,
    // it may not be set at all, and in that case won't be exposing as [].
    fillMissingListItems('#artworks.artistContribs', V([])),

    withFlattenedList('#artworks.artistContribs'),

    exposeWhetherDependencyAvailable({
      dependency: '#flattenedList',
      mode: input.value('empty'),
    }),
  ],
});