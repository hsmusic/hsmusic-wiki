import {input, templateCompositeFrom} from '#composite';
import thingConstructors from '#things';
import {isContributionList} from '#validators';

export default templateCompositeFrom({
  annotation: `withConstitutedArtwork`,

  inputs: {
    contribsProperty: input({type: 'string'}),
    artistProperty: input({type: 'string'}),
    dateProperty: input({type: 'string'}),
  },

  outputs: ['#constitutedArtwork'],

  steps: () => [
    {
      dependencies: [
        input.myself(),
        'find',

        input('contribsProperty'),
        input('dateProperty'),
      ],

      compute: (continuation, {
        [input.myself()]: myself,
        ['find']: find,

        [input('contribsProperty')]: contribsProperty,
        [input('dateProperty')]: dateProperty,
      }) => continuation({
        ['#constitutedArtwork']:
          Object.assign(new thingConstructors.Artwork, {
            thing: myself,
            find: find,

            artistContribsFromThingProperty: contribsProperty,
            dateFromThingProperty: dateProperty,
          }),
      }),
    },
  ],
});
