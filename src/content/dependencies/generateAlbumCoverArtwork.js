export default {
  contentDependencies: ['generateCoverArtwork'],

  relations: (relation, album) => ({
    coverArtwork:
      relation('generateCoverArtwork', album.artTags),
  }),

  data: (album) => ({
    path:
      ['media.albumCover', album.directory, album.coverArtFileExtension],

    color:
      album.color,
  }),

  generate: (data, relations) =>
    relations.coverArtwork.slots({
      path: data.path,
      color: data.color,
    }),
};
