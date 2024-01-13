export default {
  contentDependencies: [
    'generateColorStyleAttribute',
    'generateTextWithTooltip',
    'generateTooltip',
    'linkTemplate',
  ],

  extraDependencies: ['html', 'language'],

  relations: (relation, _pathKey, thing) => ({
    linkTemplate:
      relation('linkTemplate'),

    colorStyle:
      relation('generateColorStyleAttribute', thing.color ?? null),

    textWithTooltip:
      relation('generateTextWithTooltip'),

    tooltip:
      relation('generateTooltip'),
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

    tooltipStyle: {
      validate: v => v.is('none', 'auto', 'browser', 'wiki'),
      default: 'auto',
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
    const path =
      slots.path ?? data.path;

    const linkAttributes = slots.attributes;
    const wrapperAttributes = html.attributes();

    const showShortName =
      (slots.preferShortName
        ? data.nameShort && data.nameShort !== data.name
        : false);

    const name =
      (showShortName
        ? data.nameShort
        : data.name);

    const showWikiTooltip =
      (slots.tooltipStyle === 'auto'
        ? showShortName
        : slots.tooltipStyle === 'wiki');

    const wikiTooltip =
      showWikiTooltip &&
        relations.tooltip.slots({
          attributes: {class: 'thing-name-tooltip'},
          content: data.name,
        });

    if (slots.tooltipStyle === 'browser') {
      linkAttributes.add('title', data.name);
    }

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

      if (showWikiTooltip) {
        wrapperAttributes.add(colorStyle);
      } else {
        linkAttributes.add(colorStyle);
      }
    }

    return relations.textWithTooltip.slots({
      attributes: wrapperAttributes,

      text:
        relations.linkTemplate.slots({
          path: slots.anchor ? [] : path,
          href: slots.anchor ? '' : null,
          attributes: linkAttributes,
          hash: slots.hash,
          linkless: slots.linkless,
          content,
        }),

      tooltip:
        wikiTooltip ?? null,
    });
  },
}
