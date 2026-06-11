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

    default: input({
      validate: isBoolean,
      defaultValue: false,
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
        input('default'),
      ],

      compute({
        [input('contribs')]: contribs,
        [input('artwork')]: artwork,
        [input('artworks')]: artworks,
        [input('default')]: defaultValue,
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

        return defaultValue;
      },
    },
  ],
});
