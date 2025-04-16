import {input, templateCompositeFrom} from '#composite';
import thingConstructors from '#things';
import {isContributionList} from '#validators';

export default templateCompositeFrom({
  annotation: `withConstitutedArtwork`,

  inputs: {
    thingProperty: input({type: 'string', acceptsNull: true}),
    dimensionsFromThingProperty: input({type: 'string', acceptsNull: true}),
    fileExtensionFromThingProperty: input({type: 'string', acceptsNull: true}),
    dateFromThingProperty: input({type: 'string', acceptsNull: true}),
    artistContribsFromThingProperty: input({type: 'string', acceptsNull: true}),
    artistContribsArtistProperty: input({type: 'string', acceptsNull: true}),
    artTagsFromThingProperty: input({type: 'string', acceptsNull: true}),
    referencedArtworksFromThingProperty: input({type: 'string', acceptsNull: true}),
  },

  outputs: ['#constitutedArtwork'],

  steps: () => [
    {
      dependencies: [
        input.myself(),
        input('thingProperty'),
        input('dimensionsFromThingProperty'),
        input('fileExtensionFromThingProperty'),
        input('dateFromThingProperty'),
        input('artistContribsFromThingProperty'),
        input('artistContribsArtistProperty'),
        input('artTagsFromThingProperty'),
        input('referencedArtworksFromThingProperty'),
      ],

      compute: (continuation, {
        [input.myself()]: myself,
        [input('thingProperty')]: thingProperty,
        [input('dimensionsFromThingProperty')]: dimensionsFromThingProperty,
        [input('fileExtensionFromThingProperty')]: fileExtensionFromThingProperty,
        [input('dateFromThingProperty')]: dateFromThingProperty,
        [input('artistContribsFromThingProperty')]: artistContribsFromThingProperty,
        [input('artistContribsArtistProperty')]: artistContribsArtistProperty,
        [input('artTagsFromThingProperty')]: artTagsFromThingProperty,
        [input('referencedArtworksFromThingProperty')]: referencedArtworksFromThingProperty,
      }) => continuation({
        ['#constitutedArtwork']:
          Object.assign(new thingConstructors.Artwork, {
            thing: myself,
            thingProperty,
            dimensionsFromThingProperty,
            fileExtensionFromThingProperty,
            artistContribsFromThingProperty,
            artistContribsArtistProperty,
            artTagsFromThingProperty,
            dateFromThingProperty,
            referencedArtworksFromThingProperty,
          }),
      }),
    },
  ],
});
