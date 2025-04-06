import {input, templateCompositeFrom} from '#composite';
import thingConstructors from '#things';
import {isContributionList} from '#validators';

export default templateCompositeFrom({
  annotation: `withConstitutedArtwork`,

  inputs: {
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
        input('fileExtensionFromThingProperty'),
        input('artistContribsFromThingProperty'),
        input('artistContribsArtistProperty'),
        input('dateFromThingProperty'),
      ],

      compute: (continuation, {
        [input.myself()]: myself,
        [input('fileExtensionFromThingProperty')]: fileExtensionFromThingProperty,
        [input('artistContribsFromThingProperty')]: artistContribsFromThingProperty,
        [input('artistContribsArtistProperty')]: artistContribsArtistProperty,
        [input('dateFromThingProperty')]: dateFromThingProperty,
      }) => continuation({
        ['#constitutedArtwork']:
          Object.assign(new thingConstructors.Artwork, {
            thing: myself,
            fileExtensionFromThingProperty,
            artistContribsFromThingProperty,
            artistContribsArtistProperty,
            dateFromThingProperty,
          }),
      }),
    },
  ],
});
