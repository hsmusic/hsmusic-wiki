export default {
  contentDependencies: ['linkTemplate'],
  extraDependencies: ['getColors', 'html', 'language'],

  relations: (relation) => ({
    linkTemplate:
      relation('linkTemplate'),
  }),

  data: (pathKey, thing) => ({
    name: thing.name,
    nameShort: thing.nameShort ?? thing.shortName,

    color: thing.color,

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

  generate(data, relations, slots, {getColors, html, language}) {
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

    if (slots.color !== false) addColor: {
      const color =
        (typeof slots.color === 'string'
          ? slots.color
          : data.color);

      if (!color) {
        break addColor;
      }

      let selectColors;

      switch (slots.colorContext) {
        case 'image-box':
          selectColors = {
            '--primary-color': 'primary',
            '--dim-color': 'dim',
            '--deep-color': 'deep',
            '--bg-black-color': 'bgBlack',
          };
          break;

        case 'primary-only':
          selectColors = {
            '--primary-color': 'primary',
          };
          break;

        default:
          break addColor;
      }

      const colors = getColors(color);
      const selectedColors = [];

      for (const [variable, key] of Object.entries(selectColors)) {
        selectedColors.push(`${variable}: ${colors[key]}`);
      }

      attributes.add('style', selectedColors);
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
