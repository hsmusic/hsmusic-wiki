export default {
  relations: (relation, _pathKey, thing) => ({
    linkTemplate:
      relation('linkTemplate'),

    colorStyle:
      relation('generateColorStyleAttribute', thing.color ?? null),

    textWithTooltip:
      relation('generateTextWithTooltip'),

    tooltip:
      relation('generateTooltip'),

    name:
      relation('generateName', thing),
  }),

  data: (pathKey, thing) => ({
    name: thing.name,
    nameShort: thing.nameShort ?? thing.shortName,
    nameText: thing.nameText,

    nameDetail:
      thing.nameDetail ??
      thing.nameDetailAcrossWiki ??
      null,

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

    showTooltip: {
      // This is a bit of a misnomer since it just switches between two
      // modes of differently conditional behavior (or no tooltip ever).
      // But there's no world where BOTH modes are active at once, so.
      validate: v => v.is(
        // false - no tooltip
        false,

        // wiki - shows a wiki tooltip containing the thing's entire name
        // if slots.preferShortName is set and a short name is present
        'wiki',

        // browser - shows a browser tooltip containing the thing's name
        // if slots.content is set
        'browser'),

      default: false,
    },

    showNameDetail: {
      validate: v => v.is(false, 'accent', 'inside'),
      default: false,
    },

    color: {
      validate: v => v.anyOf(v.isBoolean, v.isColor),
      default: true,
    },

    colorContext: {
      validate: v => v.is('image-box', 'primary-only'),
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

    const name =
      relations.name.slot('preferShortName', slots.preferShortName);

    const showCustomContent =
      !html.isBlank(slots.content);

    const showShortName =
      !!(slots.preferShortName &&
         data.nameShort &&
         data.nameShort !== data.name &&
        !data.nameText &&
        !showCustomContent);

    const effectiveTooltipStyle =
      (slots.showTooltip === 'wiki'
        ? (showShortName ? 'wiki' : null)

     : slots.showTooltip === 'browser'
        ? (showCustomContent ? 'browser' : null)

        : null);

    if (effectiveTooltipStyle === 'browser') {
      linkAttributes.add('title', data.name);
    }

    let wikiTooltip = null;
    if (effectiveTooltipStyle === 'wiki') {
      wikiTooltip =
        relations.tooltip.slots({
          attributes: {class: 'thing-name-tooltip'},
          content: data.name,
        });

      linkAttributes.add('class', 'text-with-tooltip-interaction-cue');
    }

    const showNameDetail =
      !!(slots.showNameDetail &&
         data.nameDetail &&
        !showCustomContent);

    const effectiveNameDetailStyle =
      (showNameDetail === true
        ? slots.showNameDetail
        : null);

    const nameDetailCapsule =
      language.encapsulate('misc.linkWithNameDetail');

    const content =
      (showCustomContent
        ? slots.content

     : effectiveNameDetailStyle === 'inside'
        ? language.$(nameDetailCapsule, 'insideLink', {
            name,
            detail: data.nameDetail,
          })

        : name);

    if (slots.color !== false) {
      const {colorStyle} = relations;

      colorStyle.setSlot('context', slots.colorContext);

      if (typeof slots.color === 'string') {
        colorStyle.setSlot('color', slots.color);
      }

      if (effectiveTooltipStyle === 'wiki') {
        wrapperAttributes.add(colorStyle);
      } else {
        linkAttributes.add(colorStyle);
      }
    }

    const link =
      relations.linkTemplate.slots({
        path: slots.anchor ? [] : path,
        href: slots.anchor ? '' : null,
        attributes: linkAttributes,
        hash: slots.hash,
        linkless: slots.linkless,
        content,
      });

    const text =
      (effectiveNameDetailStyle === 'accent'
        ? language.$(nameDetailCapsule, 'withAccent', {
            link,

            accent:
              html.tag('span', {class: 'name-detail'},
                language.$(nameDetailCapsule, 'accent', {
                  detail: data.nameDetail,
                })),
          })

        : link);

    return relations.textWithTooltip.slots({
      attributes: wrapperAttributes,
      customInteractionCue: true,

      text,

      tooltip:
        wikiTooltip ?? null,
    });
  },
}
