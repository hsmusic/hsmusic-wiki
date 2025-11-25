import {input, templateCompositeFrom} from '#composite';
import {isContributionList} from '#validators';

import {exposeDependencyOrContinue} from '#composite/control-flow';

import {
  withRecontextualizedContributionList,
  withRedatedContributionList,
  withResolvedContribs,
} from '#composite/wiki-data';

import exitWithoutUniqueCoverArt from './exitWithoutUniqueCoverArt.js';
import withPropertyFromAlbum from './withPropertyFromAlbum.js';

export default templateCompositeFrom({
  annotation: `withCoverArtistContribs`,

  inputs: {
    from: input({
      defaultDependency: '_coverArtistContribs',
      validate: isContributionList,
      acceptsNull: true,
    }),
  },

  outputs: ['#coverArtistContribs'],

  steps: () => [
    exitWithoutUniqueCoverArt({
      value: input.value([]),
    }),

    withResolvedContribs({
      from: input('from'),
      thingProperty: input.value('coverArtistContribs'),
      artistProperty: input.value('trackCoverArtistContributions'),
      date: 'coverArtDate',
    }).outputs({
      '#resolvedContribs': '#coverArtistContribs',
    }),

    exposeDependencyOrContinue({
      dependency: '#coverArtistContribs',
      mode: input.value('empty'),
    }),

    withPropertyFromAlbum({
      property: input.value('trackCoverArtistContribs'),
    }),

    withRecontextualizedContributionList({
      list: '#album.trackCoverArtistContribs',
      artistProperty: input.value('trackCoverArtistContributions'),
    }),

    withRedatedContributionList({
      list: '#album.trackCoverArtistContribs',
      date: 'coverArtDate',
    }),

    {
      dependencies: ['#album.trackCoverArtistContribs'],
      compute: (continuation, {
        ['#album.trackCoverArtistContribs']: coverArtistContribs,
      }) => continuation({
        ['#coverArtistContribs']: coverArtistContribs,
      }),
    },
  ],
});
