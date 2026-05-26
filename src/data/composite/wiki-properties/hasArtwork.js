import {input, templateCompositeFrom, V} from '#composite';
import {empty} from '#sugar';
import {isBoolean, isContributionList, isThing, strictArrayOf}
  from '#validators';

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

  update: {
    validate: isBoolean,
  },

  compose: false,

  steps: () => [
    {
      transform(value, continuation) {
        if (value === true) {
          return true;
        }

        if (value === false) {
          return false;
        }

        return continuation();
      },
    },

    {
      dependencies: [
        input('contribs'),
        input('artwork'),
        input('artworks'),
      ],

      compute({
        [input('contribs')]: contribs,
        [input('artwork')]: artwork,
        [input('artworks')]: artworks,
      }) {
        if (!empty(contribs)) {
          return true;
        }

        if (artwork) {
          return true;
        }

        if (!empty(artworks)) {
          return true;
        }

        return false;
      },
    },
  ],
});
