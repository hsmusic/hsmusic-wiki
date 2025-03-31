import {input, templateCompositeFrom} from '#composite';
import {isDate} from '#validators';

import {raiseOutputWithoutDependency} from '#composite/control-flow';

import withDate from './withDate.js';
import withHasUniqueCoverArt from './withHasUniqueCoverArt.js';
import withPropertyFromAlbum from './withPropertyFromAlbum.js';

export default templateCompositeFrom({
  annotation: `withTrackArtDate`,

  inputs: {
    from: input({
      validate: isDate,
      defaultDependency: 'coverArtDate',
      acceptsNull: true,
    }),
  },

  outputs: ['#trackArtDate'],

  steps: () => [
    withHasUniqueCoverArt(),

    raiseOutputWithoutDependency({
      dependency: '#hasUniqueCoverArt',
      mode: input.value('falsy'),
      output: input.value({'#trackArtDate': null}),
    }),

    {
      dependencies: [input('from')],
      compute: (continuation, {
        [input('from')]: from,
      }) =>
        (from
          ? continuation.raiseOutput({'#trackArtDate': from})
          : continuation()),
    },

    withPropertyFromAlbum({
      property: input.value('trackArtDate'),
    }),

    {
      dependencies: ['#album.trackArtDate'],
      compute: (continuation, {
        ['#album.trackArtDate']: albumTrackArtDate,
      }) =>
        (albumTrackArtDate
          ? continuation.raiseOutput({'#trackArtDate': albumTrackArtDate})
          : continuation()),
    },

    withDate().outputs({
      '#date': '#trackArtDate',
    }),
  ],
});
