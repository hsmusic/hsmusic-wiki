export default {
  contentDependencies: ['generateCoverArtwork'],

  relations(relation, album) {
    return {
      coverArtwork:
        relation('generateCoverArtwork', album.artTags),
    };
  },

  data(album) {
    return {
      path: ['media.albumCover', album.directory, album.coverArtFileExtension],
    };
  },

  generate(data, relations) {
    return relations.coverArtwork
      .slots({
        path: data.path,
      });
  },
};
