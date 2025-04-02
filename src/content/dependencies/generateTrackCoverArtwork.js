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

    image:
      relation('image'),

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
    path:
      (artwork.thing.album
        ? ['media.trackCover',
           artwork.thing.album.directory,
           artwork.thing.directory,
           artwork.thing.coverArtFileExtension]
        : ['media.albumCover',
           artwork.thing.directory,
           artwork.thing.coverArtFileExtension]),

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

    showNonUniqueLine: {
      type: 'boolean',
      default: false,
    },
  },

  generate: (data, relations, slots, {html, language}) =>
    relations.coverArtwork.slots({
      mode: slots.mode,

      image:
        relations.image.slots({
          path: data.path,
          // color: data.color,
          alt: language.$('misc.alt.trackCover'),
        }),

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

        slots.showNonUniqueLine &&
        data.nonUnique &&
          html.tag('p', {class: 'image-details'},
            {class: 'non-unique-details'},

            language.$('misc.coverArtwork.trackArtFromAlbum', {
              album:
                relations.albumLink.slots({
                  color: false,
                }),
            })),
      ],
    }),
};

