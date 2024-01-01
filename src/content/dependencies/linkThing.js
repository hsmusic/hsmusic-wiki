export default {
  contentDependencies: ['generateColorStyleAttribute', 'linkTemplate'],
  extraDependencies: ['html', 'language'],

  relations: (relation, _pathKey, thing) => ({
    linkTemplate:
      relation('linkTemplate'),

    colorStyle:
      relation('generateColorStyleAttribute', thing.color ?? null),
  }),

  data: (pathKey, thing) => ({
    name: thing.name,
    nameShort: thing.nameShort ?? thing.shortName,

    path:
      (pathKey
        ? [pathKey, thing.directory]
        : null),
  }),

  slots: {
    content: {
      type: 'html',
      mutable: false,
    },

    attributes: {
      type: 'attributes',
      mutable: true,
    },

    preferShortName: {
      type: 'boolean',
      default: false,
    },

    tooltip: {
      validate: v => v.anyOf(v.isBoolean, v.isHTML),
      default: false,
    },

    color: {
      validate: v => v.anyOf(v.isBoolean, v.isColor),
      default: true,
    },

    colorContext: {
      validate: v => v.is(
        'image-box',
        'primary-only'),

      default: 'primary-only',
    },

    path: {
      validate: v => v.validateArrayItems(v.isString),
    },

    anchor: {type: 'boolean', default: false},
    linkless: {type: 'boolean', default: false},
    hash: {type: 'string'},
  },

  generate(data, relations, slots, {html, language}) {
    const {attributes} = slots;

    const path =
      slots.path ?? data.path;

    const name =
      (slots.preferShortName
        ? data.nameShort ?? data.name ?? null
        : data.name ?? null);

    const content =
      (html.isBlank(slots.content)
        ? language.sanitize(name)
        : slots.content);

    if (slots.color !== false) {
      const {colorStyle} = relations;

      colorStyle.setSlot('context', slots.colorContext);

      if (typeof slots.color === 'string') {
        colorStyle.setSlot('color', slots.color);
      }

      attributes.add(colorStyle);
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
        tooltip,
        attributes,
        hash: slots.hash,
        linkless: slots.linkless,
      });
  },
}
