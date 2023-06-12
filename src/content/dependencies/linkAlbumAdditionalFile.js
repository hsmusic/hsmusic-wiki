export default {
  contentDependencies: ['linkTemplate'],

  relations(relation) {
    return {
      linkTemplate: relation('linkTemplate'),
    };
  },

  data(album, file) {
    return {
      albumDirectory: album.directory,
      file,
    };
  },

  generate(data, relations) {
    return relations.linkTemplate
      .slots({
        path: ['media.albumAdditionalFile', data.albumDirectory, data.file],
        content: data.file,
      });
  },
};
