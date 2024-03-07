// Gets the date of cover art release. This represents only the track's own
// unique cover artwork, if any.
//
// If the 'fallback' option is false (the default), this will only output
// the track's own coverArtDate or its album's trackArtDate. If 'fallback'
// is set, and neither of these is available, it'll output the track's own
// date instead.

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

    fallback: input({
      type: 'boolean',
      defaultValue: false,
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
      dependencies: [
        '#album.trackArtDate',
        input('fallback'),
      ],

      compute: (continuation, {
        ['#album.trackArtDate']: albumTrackArtDate,
        [input('fallback')]: fallback,
      }) =>
        (albumTrackArtDate
          ? continuation.raiseOutput({'#trackArtDate': albumTrackArtDate})
       : fallback
          ? continuation()
          : continuation.raiseOutput({'#trackArtDate': null})),
    },

    withDate().outputs({
      '#date': '#trackArtDate',
    }),
  ],
});
