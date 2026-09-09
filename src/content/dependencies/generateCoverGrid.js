import {unique} from '#sugar';

export default {
  relations: (relation, artworksAndThings) => ({
    expando:
      relation('generateGridExpando'),

    items:
      (artworksAndThings
        ? artworksAndThings.map(x => relation('generateCoverGridItem', x))
        : null),
  }),

  data: (artworksAndThings) => ({
    allWarnings:
      (artworksAndThings ?? [])
        .filter(artworkOrThing => artworkOrThing.isArtwork)
        .flatMap(artwork => artwork.contentWarnings)
  }),

  slots: {
    attributes: {type: 'attributes', mutable: false},

    // Configuration stuff
    lazy: {validate: v => v.anyOf(v.isWholeNumber, v.isBoolean)},
    cutIndex: {validate: v => v.isWholeNumber},

    // Optional - overrides the defaults
    items: {validate: v => v.strictArrayOf(v.isHTML)},
    allWarnings: {validate: v => v.looseArrayOf(v.isString)},

    // Optional
    actionLinks: {validate: v => v.sparseArrayOf(v.isHTML)},
    bottomCaption: {type: 'html', mutable: false},
  },

  generate(data, relations, slots, {html, language}) {
    const items =
      slots.items ??
      relations.items;

    for (const [index, item] of items.entries()) {
      item.setSlots({
        lazy:
          (typeof slots.lazy === 'number'
            ? index >= slots.lazy
         : typeof slots.lazy === 'boolean'
            ? slots.lazy
            : false),

        cut:
          slots.cutIndex >= 1 &&
          index >= slots.cutIndex,
      });
    }

    const anyTabsOnFirstLine =
      items.slice(0, 4)
        .map(item => item.getSlotValue('tab'))
        .some(tab => !html.isBlank(tab));

    const allWarnings =
      slots.allWarnings ??
      data.allWarnings;

    const revealAllWarningsLine =
      language.encapsulate('misc.coverGrid.revealAll', capsule =>
        html.tag('div', {class: 'reveal-all-container'},
          anyTabsOnFirstLine &&
            {class: 'has-nearby-tab'},

          html.tag('p', {class: 'reveal-all'},
            {[html.joinChildren]: html.tag('br')},

            html.tag('a', {href: '#'},
              {[html.onlyIfSiblings]: true},

              html.tag('span', {class: 'reveal-label'},
                language.$(capsule, 'reveal')),

              html.tag('span', {class: 'conceal-label'},
                {style: 'display: none'},
                language.$(capsule, 'conceal'))),

            html.tag('span', {class: 'warnings'},
              {[html.onlyIfContent]: true},

              language.$(capsule, 'warnings', {
                [language.onlyIfOptions]: ['warnings'],

                warnings:
                  language.formatUnitList(
                    unique(allWarnings.filter(Boolean))
                      .sort()
                      .map(warning => html.tag('b', warning))),
              })))));

    const actionLinks =
      html.tag('div', {class: 'grid-actions'},
        {[html.onlyIfContent]: true},

        (slots.actionLinks ?? [])
          .filter(link => link && !html.isBlank(link))
          .map(link => link
            .slot('attributes', {class: ['grid-item', 'box']})));

    const bottom =
      (slots.cutIndex >= 1 &&
       slots.cutIndex < items.length
        ? relations.expando.slot('caption', slots.bottomCaption)
        : html.tag('p', {class: 'grid-caption'},
            {[html.onlyIfContent]: true},
            slots.bottomCaption));

    const grid =
      html.tag('div', {class: 'grid-listing'},
        {[html.onlyIfContent]: true},
        slots.attributes,

        revealAllWarningsLine,
        items,
        actionLinks,
        bottom);

    return grid;
  },
};
