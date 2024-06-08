export default {
  contentDependencies: ['generateCoverArtwork'],

  relations: (relation) => ({
    coverArtwork:
      relation('generateCoverArtwork'),
  }),

  data: (flash) => ({
    path:
      ['media.flashArt', flash.directory, flash.coverArtFileExtension],

    color:
      flash.color,

    dimensions:
      flash.coverArtDimensions,
  }),

  generate: (data, relations) =>
    relations.coverArtwork.slots({
      path: data.path,
      color: data.color,
      dimensions: data.dimensions,
    }),
};
