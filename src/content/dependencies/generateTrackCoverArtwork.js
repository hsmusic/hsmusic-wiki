export default {
  contentDependencies: ['generateCoverArtwork'],

  relations(relation, track) {
    return {
      coverArtwork:
        relation('generateCoverArtwork',
          (track.hasUniqueCoverArt
            ? track.artTags
            : track.album.artTags)),
    };
  },

  data(track) {
    return {
      path:
        (track.hasUniqueCoverArt
          ? ['media.trackCover', track.album.directory, track.directory, track.coverArtFileExtension]
          : ['media.albumCover', track.album.directory, track.album.coverArtFileExtension]),
    };
  },

  generate(data, relations) {
    return relations.coverArtwork
      .slots({
        path: data.path,
      });
  },
};
