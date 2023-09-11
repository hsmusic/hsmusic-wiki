export default {
  contentDependencies: ['linkTemplate'],
  extraDependencies: ['html'],

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

  slots: {
    content: {type: 'html'},

    preferShortName: {type: 'boolean', default: false},

    tooltip: {
      validate: v => v.oneOf(v.isBoolean, v.isHTML),
      default: false,
    },

    color: {
      validate: v => v.oneOf(v.isBoolean, v.isColor),
      default: true,
    },

    anchor: {type: 'boolean', default: false},

    attributes: {validate: v => v.isAttributes},
    hash: {type: 'string'},
  },

  generate(data, relations, slots, {html}) {
    const path = [data.pathKey, data.directory];

    const name =
      (slots.preferShortName
        ? data.nameShort ?? data.name ?? null
        : data.name ?? null);

    const content =
      (html.isBlank(slots.content)
        ? name
        : slots.content);

    let color = null;
    if (slots.color === true) {
      color = data.color ?? null;
    } else if (typeof slots.color === 'string') {
      color = slots.color;
    }

    let tooltip = null;
    if (slots.tooltip === true) {
      tooltip = name;
    } else if (typeof slots.tooltip === 'string') {
      tooltip = slots.tooltip;
    }

    return relations.linkTemplate
      .slots({
        path: slots.anchor ? [] : path,
        href: slots.anchor ? '' : null,
        content,
        color,
        tooltip,

        attributes: slots.attributes,
        hash: slots.hash,
      });
  },
}
