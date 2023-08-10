export default {
  contentDependencies: ['generateCoverArtwork'],

  relations: (relation) =>
    ({coverArtwork: relation('generateCoverArtwork')}),

  data: (flash) =>
    ({path: ['media.flashArt', flash.directory, flash.coverArtFileExtension]}),

  generate: (data, relations) =>
    relations.coverArtwork.slot('path', data.path),
};
