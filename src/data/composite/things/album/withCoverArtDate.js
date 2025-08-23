import {input, templateCompositeFrom} from '#composite';
import {isDate} from '#validators';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {withHasArtwork} from '#composite/wiki-data';

import withDate from './withDate.js';

export default templateCompositeFrom({
  annotation: `withCoverArtDate`,

  inputs: {
    from: input({
      validate: isDate,
      defaultDependency: 'coverArtDate',
      acceptsNull: true,
    }),
  },

  outputs: ['#coverArtDate'],

  steps: () => [
    withHasArtwork({
      contribs: 'coverArtistContribs',
      artworks: 'coverArtworks',
    }),

    raiseOutputWithoutDependency({
      dependency: '#hasArtwork',
      mode: input.value('falsy'),
      output: input.value({'#coverArtDate': null}),
    }),

    {
      dependencies: [input('from')],
      compute: (continuation, {
        [input('from')]: from,
      }) =>
        (from
          ? continuation.raiseOutput({'#coverArtDate': from})
          : continuation()),
    },

    withDate().outputs({
      '#date': '#coverArtDate',
    }),
  ],
});
