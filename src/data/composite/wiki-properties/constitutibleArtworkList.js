import {input, templateCompositeFrom} from '#composite';
import {isContributionList, isDate, validateWikiData} from '#validators';

import {exitWithoutDependency, exposeUpdateValueOrContinue}
  from '#composite/control-flow';
import {withConstitutedArtwork} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `constitutibleArtwork`,

  compose: false,

  inputs: {
    contribs: input.staticDependency({
      validate: isContributionList,
      acceptsNull: true,
    }),

    date: input.staticDependency({
      validate: isDate,
      acceptsNull: true,
    }),

    artistProperty: input.staticValue({
      type: 'string',
    }),
  },

  steps: () => [
    exposeUpdateValueOrContinue({
      validate: input.value(
        validateWikiData({
          referenceType: 'artwork',
        })),
    }),

    exitWithoutDependency({
      dependency: input('contribs'),
      value: input.value([]),
    }),

    {
      dependencies: [
        input.staticDependency('contribs'),
        input.staticDependency('date'),
      ],

      compute: (continuation, {
        [input.staticDependency('contribs')]: contribsProperty,
        [input.staticDependency('date')]: dateProperty,
      }) => continuation({
        ['#contribsProperty']: contribsProperty,
        ['#dateProperty']: dateProperty,
      })
    },

    withConstitutedArtwork({
      contribsProperty: '#contribsProperty',
      artistProperty: input('artistProperty'),
      dateProperty: '#dateProperty',
    }),

    {
      dependencies: ['#constitutedArtwork'],
      compute: ({
        ['#constitutedArtwork']: constitutedArtwork,
      }) => [constitutedArtwork],
    },
  ],
});
