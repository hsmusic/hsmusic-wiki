// Gets the current thing's coverArtDate, or, if the 'fallback' option is set,
// the thing's date. This is always null if the thing doesn't actually have
// any coverArtistContribs.

import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';

import withResolvedContribs from './withResolvedContribs.js';

export default templateCompositeFrom({
  annotation: `withCoverArtDate`,

  inputs: {
    fallback: input({
      type: 'boolean',
      defaultValue: false,
    }),
  },

  outputs: ['#coverArtDate'],

  steps: () => [
    withResolvedContribs({
      from: 'coverArtistContribs',
      date: input.value(null),
    }),

    raiseOutputWithoutDependency({
      dependency: '#resolvedContribs',
      mode: input.value('empty'),
      output: input.value({'#coverArtDate': null}),
    }),

    {
      dependencies: ['coverArtDate', input('fallback')],
      compute: (continuation, {
        ['coverArtDate']: coverArtDate,
        [input('fallback')]: fallback,
      }) =>
        (coverArtDate
          ? continuation.raiseOutput({'#coverArtDate': coverArtDate})
       : fallback
          ? continuation()
          : continuation.raiseOutput({'#coverArtDate': null})),
    },

    {
      dependencies: ['date'],
      compute: (continuation, {date}) =>
        (date
          ? continuation.raiseOutput({'#coverArtDate': date})
          : continuation.raiseOutput({'#coverArtDate': null})),
    },
  ],
});
