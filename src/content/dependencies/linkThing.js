export default {
  contentDependencies: [
    'linkTemplate',
  ],

  extraDependencies: [
    'html',
  ],

  relations(relation) {
    return {
      linkTemplate: relation('linkTemplate'),
    };
  },

  data(pathKey, thing) {
    return {
      pathKey,

      color: thing.color,
      directory: thing.directory,

      name: thing.name,
      nameShort: thing.nameShort,
    };
  },

  generate(data, relations, {html}) {
    const path = [data.pathKey, data.directory];

    return html.template({
      annotation: 'linkThing',

      slots: {
        content: relations.linkTemplate.getSlotDescription('content'),
        preferShortName: {type: 'boolean', default: false},

        color: relations.linkTemplate.getSlotDescription('color'),
        attributes: relations.linkTemplate.getSlotDescription('attributes'),
        hash: relations.linkTemplate.getSlotDescription('hash'),
      },

      content(slots) {
        let content = slots.content;

        if (html.isBlank(content)) {
          content =
            (slots.preferShortName
              ? data.nameShort ?? data.name
              : data.name);
        }

        const color = slots.color ?? data.color ?? null;

        return relations.linkTemplate
          .slots({
            path,
            content,
            color,

            attributes: slots.attributes,
            hash: slots.hash,
          });
      },
    });
  },
}
