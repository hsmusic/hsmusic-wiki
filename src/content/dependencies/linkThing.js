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

        tooltip: {
          validate: v => v.oneOf(v.isBoolean, v.isString),
        },

        color: relations.linkTemplate.getSlotDescription('color'),
        attributes: relations.linkTemplate.getSlotDescription('attributes'),
        hash: relations.linkTemplate.getSlotDescription('hash'),
      },

      content(slots) {
        let content = slots.content;

        const name =
          (slots.preferShortName
            ? data.nameShort ?? data.name
            : data.name);

        if (html.isBlank(content)) {
          content = name;
        }

        const color = slots.color ?? data.color ?? null;

        let tooltip = null;
        if (slots.tooltip === true) {
          tooltip = name;
        } else if (typeof slots.tooltip === 'string') {
          tooltip = slots.tooltip;
        }

        return relations.linkTemplate
          .slots({
            path,
            content,
            color,
            tooltip,

            attributes: slots.attributes,
            hash: slots.hash,
          });
      },
    });
  },
}
