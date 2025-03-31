export default {
  contentDependencies: [
    'generateCoverArtwork',
    'generateCoverArtworkArtTagDetails',
    'generateCoverArtworkArtistDetails',
    'generateCoverArtworkOriginDetails',
    'generateCoverArtworkReferenceDetails',
    'image',
    'linkAlbumReferencedArtworks',
    'linkAlbumReferencingArtworks',
  ],

  extraDependencies: ['html', 'language'],

  relations: (relation, album) => ({
    coverArtwork:
      relation('generateCoverArtwork'),

    image:
      relation('image'),

    originDetails:
      relation('generateCoverArtworkOriginDetails', album.coverArtwork),

    artTagDetails:
      relation('generateCoverArtworkArtTagDetails', album.coverArtwork),

    artistDetails:
      relation('generateCoverArtworkArtistDetails', album.coverArtwork),

    referenceDetails:
      relation('generateCoverArtworkReferenceDetails',
        album.referencedArtworks,
        album.referencedByArtworks),

    referencedArtworksLink:
      relation('linkAlbumReferencedArtworks', album),

    referencingArtworksLink:
      relation('linkAlbumReferencingArtworks', album),
  }),

  data: (album) => ({
    path:
      ['media.albumCover', album.directory, album.coverArtFileExtension],

    color:
      album.color,

    dimensions:
      album.coverArtDimensions,

    warnings:
      album.artTags
        .filter(tag => tag.isContentWarning)
        .map(tag => tag.name),
  }),

  slots: {
    mode: {type: 'string'},

    details: {
      validate: v => v.is('tags', 'artists'),
      default: 'tags',
    },

    showOriginDetails: {
      type: 'boolean',
      default: false,
    },

    showReferenceLinks: {
      type: 'boolean',
      default: false,
    },
  },

  generate: (data, relations, slots, {language}) =>
    relations.coverArtwork.slots({
      mode: slots.mode,

      image:
        relations.image.slots({
          path: data.path,
          color: data.color,
          alt: language.$('misc.alt.albumCover'),
        }),

      dimensions: data.dimensions,
      warnings: data.warnings,

      details: [
        slots.showOriginDetails &&
          relations.originDetails,

        slots.details === 'tags' &&
          relations.artTagDetails,

        slots.details === 'artists' &&
          relations.artistDetails,

        slots.showReferenceLinks &&
          relations.referenceDetails.slots({
            referencedLink:
              relations.referencedArtworksLink,

            referencingLink:
              relations.referencingArtworksLink,
          }),
      ],
    }),
};
