export default {
  contentDependencies: ['linkTemplate'],

  relations(relation) {
    return {
      linkTemplate: relation('linkTemplate'),
    };
  },

  data(album, filename) {
    return {
      albumDirectory: album.directory,
      filename,
    };
  },

  generate(data, relations) {
    return relations.linkTemplate
      .slots({
        path: ['media.albumAdditionalFile', data.albumDirectory, data.filename],
        content: data.filename,
      });
  },
};
