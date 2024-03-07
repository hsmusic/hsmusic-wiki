// Gets the current thing's coverArtDate, or, if the 'fallback' option is set,
// the thing's date. This is always null if the thing doesn't actually have
// any coverArtistContribs.

import {input, templateCompositeFrom} from '#composite';
import {isDate} from '#validators';

import {raiseOutputWithoutDependency} from '#composite/control-flow';

import withResolvedContribs from './withResolvedContribs.js';

export default templateCompositeFrom({
  annotation: `withCoverArtDate`,

  inputs: {
    from: input({
      validate: isDate,
      defaultDependency: 'coverArtDate',
      acceptsNull: true,
    }),

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
      dependencies: [input('from')],
      compute: (continuation, {
        [input('from')]: from,
      }) =>
        (from
          ? continuation.raiseOutput({'#coverArtDate': from})
          : continuation()),
    },

    {
      dependencies: [input('fallback')],
      compute: (continuation, {
        [input('fallback')]: fallback,
      }) =>
        (fallback
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
