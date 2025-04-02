export default {
  contentDependencies: [
    'generateCoverArtwork',
    'generateCoverArtworkReferenceDetails',
    'image',
    'linkAlbum',
    'linkTrackReferencedArtworks',
    'linkTrackReferencingArtworks',
  ],

  extraDependencies: ['html', 'language'],

  relations: (relation, artwork) => ({
    coverArtwork:
      relation('generateCoverArtwork', artwork),

    // referenceDetails:
    //   relation('generateCoverArtworkReferenceDetails',
    //     artwork.referencedArtworks,
    //     artwork.referencedByArtworks),

    // referencedArtworksLink:
    //   relation('linkTrackReferencedArtworks', track),

    // referencingArtworksLink:
    //   relation('linkTrackReferencingArtworks', track),

    albumLink:
      (artwork.thing.album
        ? relation('linkAlbum', artwork.thing.album)
        : relation('linkAlbum', artwork.thing)),
  }),

  data: (artwork) => ({
    // color:
    //   track.color,

    dimensions:
      artwork.thing.coverArtDimensions,

    nonUnique:
      !artwork.thing.album,

    warnings:
      artwork.artTags
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

      // color: data.color,
      alt: language.$('misc.alt.trackCover'),

      dimensions: data.dimensions,
      warnings: data.warnings,

      showOriginDetails: slots.showOriginDetails,
      showArtTagDetails: slots.details === 'tags',
      showArtistDetails: slots.details === 'artists',

      details: [
        /*
        slots.showReferenceLinks &&
          relations.referenceDetails.slots({
            referencedLink:
              relations.referencedArtworksLink,

            referencingLink:
              relations.referencingArtworksLink,
          }),
        */
      ],
    }),
};

