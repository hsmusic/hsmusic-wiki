export default {
  contentDependencies: ['generateCoverArtwork'],

  relations: (relation, album) =>
    ({coverArtwork: relation('generateCoverArtwork', album.artTags)}),

  data: (album) =>
    ({path: ['media.albumCover', album.directory, album.coverArtFileExtension]}),

  generate: (data, relations) =>
    relations.coverArtwork.slot('path', data.path),
};
