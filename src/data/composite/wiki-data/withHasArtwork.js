import {input, templateCompositeFrom} from '#composite';
import {isContributionList, isThing, strictArrayOf} from '#validators';

import {raiseOutputWithoutDependency, withResultOfAvailabilityCheck}
  from '#composite/control-flow';
import {fillMissingListItems, withFlattenedList, withPropertyFromList}
  from '#composite/data';

export default templateCompositeFrom({
  annotation: 'withHasArtwork',

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

  outputs: ['#hasArtwork'],

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
          ? continuation.raiseOutput({
              ['#hasArtwork']: true,
            })
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

    raiseOutputWithoutDependency({
      dependency: '#artworks',
      mode: input.value('empty'),
      output: input.value({'#hasArtwork': false}),
    }),

    withPropertyFromList({
      list: '#artworks',
      property: input.value('artistContribs'),
      internal: input.value(true),
    }),

    // Since we're getting the update value for each artwork's artistContribs,
    // it may not be set at all, and in that case won't be exposing as [].
    fillMissingListItems({
      list: '#artworks.artistContribs',
      fill: input.value([]),
    }),

    withFlattenedList({
      list: '#artworks.artistContribs',
    }),

    withResultOfAvailabilityCheck({
      from: '#flattenedList',
      mode: input.value('empty'),
    }).outputs({
      '#availability': '#hasArtwork',
    }),
  ],
});
