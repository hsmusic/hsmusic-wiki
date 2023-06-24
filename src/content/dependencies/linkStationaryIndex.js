// Not to be confused with "html.Stationery".

export default {
  contentDependencies: ['linkTemplate'],
  extraDependencies: ['language'],

  relations(relation) {
    return {
      linkTemplate: relation('linkTemplate'),
    };
  },

  data(pathKey, stringKey) {
    return {pathKey, stringKey};
  },

  generate(data, relations, {language}) {
    return relations.linkTemplate
      .slots({
        path: [data.pathKey],
        content: language.formatString(data.stringKey),
      });
  }
}
