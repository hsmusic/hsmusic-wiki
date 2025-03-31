export default {
  contentDependencies: [
    'generateCoverArtwork',
    'generateCoverArtworkArtTagDetails',
    'generateCoverArtworkArtistDetails',
    'generateCoverArtworkOriginDetails',
    'generateCoverArtworkReferenceDetails',
    'image',
    'linkAlbum',
    'linkTrackReferencedArtworks',
    'linkTrackReferencingArtworks',
  ],

  extraDependencies: ['html', 'language'],

  query: (track) => ({
    artTags:
      (track.hasUniqueCoverArt
        ? track.trackArtwork.artTags
     : track.album.hasCoverArt
        ? track.album.coverArtwork.artTags
        : []),
  }),

  relations: (relation, query, track) => ({
    coverArtwork:
      relation('generateCoverArtwork'),

    image:
      relation('image'),

    originDetails:
      relation('generateCoverArtworkOriginDetails', track.trackArtwork),

    artTagDetails:
      relation('generateCoverArtworkArtTagDetails', track.trackArtwork),

    artistDetails:
      relation('generateCoverArtworkArtistDetails', track.trackArtwork),

    referenceDetails:
      relation('generateCoverArtworkReferenceDetails',
        track.referencedArtworks,
        track.referencedByArtworks),

    referencedArtworksLink:
      relation('linkTrackReferencedArtworks', track),

    referencingArtworksLink:
      relation('linkTrackReferencingArtworks', track),

    albumLink:
      relation('linkAlbum', track.album),
  }),

  data: (query, track) => ({
    path:
      (track.hasUniqueCoverArt
        ? ['media.trackCover', track.album.directory, track.directory, track.coverArtFileExtension]
        : ['media.albumCover', track.album.directory, track.album.coverArtFileExtension]),

    color:
      track.color,

    dimensions:
      (track.hasUniqueCoverArt
        ? track.coverArtDimensions
        : track.album.coverArtDimensions),

    nonUnique:
      !track.hasUniqueCoverArt,

    warnings:
      query.artTags
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
          color: data.color,
          alt: language.$('misc.alt.trackCover'),
        }),

      dimensions: data.dimensions,
      warnings: data.warnings,

      details: [
        slots.showOriginDetails &&
          relations.originDetails,

        slots.details === 'tags' &&
          relations.artTagDetails,

        slots.details === 'artists'&&
          relations.artistDetails,

        slots.showReferenceLinks &&
          relations.referenceDetails.slots({
            referencedLink:
              relations.referencedArtworksLink,

            referencingLink:
              relations.referencingArtworksLink,
          }),

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

