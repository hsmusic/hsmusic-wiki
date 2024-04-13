export default {
  contentDependencies: ['generateCoverArtwork'],

  relations: (relation, track) => ({
    coverArtwork:
      relation('generateCoverArtwork',
        (track.hasUniqueCoverArt
          ? track.artTags
          : track.album.artTags)),
  }),

  data: (track) => ({
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
  }),

  generate: (data, relations) =>
    relations.coverArtwork.slots({
      path: data.path,
      color: data.color,
      dimensions: data.dimensions,
    }),
};

