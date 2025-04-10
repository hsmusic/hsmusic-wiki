import {input, templateCompositeFrom} from '#composite';
import thingConstructors from '#things';
import {isContributionList} from '#validators';

export default templateCompositeFrom({
  annotation: `withConstitutedArtwork`,

  inputs: {
    dimensionsFromThingProperty: input({type: 'string', acceptsNull: true}),
    fileExtensionFromThingProperty: input({type: 'string'}),
    artistContribsFromThingProperty: input({type: 'string'}),
    artistContribsArtistProperty: input({type: 'string'}),
    dateFromThingProperty: input({type: 'string'}),
  },

  outputs: ['#constitutedArtwork'],

  steps: () => [
    {
      dependencies: [
        input.myself(),
        input('dimensionsFromThingProperty'),
        input('fileExtensionFromThingProperty'),
        input('artistContribsFromThingProperty'),
        input('artistContribsArtistProperty'),
        input('dateFromThingProperty'),
      ],

      compute: (continuation, {
        [input.myself()]: myself,
        [input('dimensionsFromThingProperty')]: dimensionsFromThingProperty,
        [input('fileExtensionFromThingProperty')]: fileExtensionFromThingProperty,
        [input('artistContribsFromThingProperty')]: artistContribsFromThingProperty,
        [input('artistContribsArtistProperty')]: artistContribsArtistProperty,
        [input('dateFromThingProperty')]: dateFromThingProperty,
      }) => continuation({
        ['#constitutedArtwork']:
          Object.assign(new thingConstructors.Artwork, {
            thing: myself,
            dimensionsFromThingProperty,
            fileExtensionFromThingProperty,
            artistContribsFromThingProperty,
            artistContribsArtistProperty,
            dateFromThingProperty,
          }),
      }),
    },
  ],
});
