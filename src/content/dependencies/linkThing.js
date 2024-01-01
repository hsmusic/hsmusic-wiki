export default {
  contentDependencies: ['linkTemplate'],
  extraDependencies: ['html', 'language'],

  relations(relation) {
    return {
      linkTemplate: relation('linkTemplate'),
    };
  },

  data(pathKey, thing) {
    const data = {};

    if (pathKey) {
      data.pathKey = pathKey;
      data.directory = thing.directory;
    } else {
      data.pathKey = null;
    }

    data.color = thing.color;
    data.name = thing.name;
    data.nameShort = thing.nameShort ?? thing.shortName;

    return data;
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

    path: {validate: v => v.validateArrayItems(v.isString)},

    anchor: {type: 'boolean', default: false},
    linkless: {type: 'boolean', default: false},

    attributes: {type: 'attributes'},
    hash: {type: 'string'},
  },

  generate(data, relations, slots, {html, language}) {
    const path =
      (slots.path
        ? slots.path
     : data.pathKey
        ? [data.pathKey, data.directory]
        : null);

    const name =
      (slots.preferShortName
        ? data.nameShort ?? data.name ?? null
        : data.name ?? null);

    const content =
      (html.isBlank(slots.content)
        ? language.sanitize(name)
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
        linkless: slots.linkless,
      });
  },
}
