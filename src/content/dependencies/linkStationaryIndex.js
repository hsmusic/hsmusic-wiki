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
    const template = relations.linkTemplate;

    template.setSlot('path', [data.pathKey]);

    if (data.stringKey) {
      template.setSlot('content',
        language.formatString(data.stringKey));
    }

    return template;
  }
}
