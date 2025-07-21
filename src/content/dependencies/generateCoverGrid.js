import {empty, stitchArrays, unique} from '#sugar';

export default {
  contentDependencies: ['generateGridActionLinks'],
  extraDependencies: ['html', 'language'],

  relations(relation) {
    return {
      actionLinks: relation('generateGridActionLinks'),
    };
  },

  slots: {
    attributes: {type: 'attributes', mutable: false},

    images: {validate: v => v.strictArrayOf(v.isHTML)},
    links: {validate: v => v.strictArrayOf(v.isHTML)},
    names: {validate: v => v.strictArrayOf(v.isHTML)},
    info: {validate: v => v.strictArrayOf(v.isHTML)},
    tab: {validate: v => v.strictArrayOf(v.isHTML)},
    notFromThisGroup: {validate: v => v.strictArrayOf(v.isBoolean)},

    // Differentiating from sparseArrayOf here - this list of classes should
    // have the same length as the items above, i.e. nulls aren't going to be
    // filtered out of it, but it is okay to *include* null (standing in for
    // no classes for this grid item).
    classes: {
      validate: v =>
        v.strictArrayOf(
          v.optional(
            v.anyOf(
              v.isArray,
              v.isString))),
    },

    itemAttributes: {
      validate: v =>
        v.strictArrayOf(
          v.optional(v.isAttributes)),
    },

    lazy: {validate: v => v.anyOf(v.isWholeNumber, v.isBoolean)},
    actionLinks: {validate: v => v.sparseArrayOf(v.isHTML)},

    revealAllWarnings: {
      validate: v => v.looseArrayOf(v.isString),
    },
  },

  generate: (relations, slots, {html, language}) =>
    html.tag('div', {class: 'grid-listing'},
      slots.attributes,
      {[html.onlyIfContent]: true},

      [
        !empty((slots.revealAllWarnings ?? []).filter(Boolean)) &&
          language.encapsulate('misc.coverGrid.revealAll', capsule =>
            html.tag('div', {class: 'reveal-all-container'},
              ((slots.tab ?? [])
                .slice(0, 4)
                .some(tab => tab && !html.isBlank(tab))) &&

                {class: 'has-nearby-tab'},

              html.tag('p', {class: 'reveal-all'}, [
                html.tag('a', {href: '#'}, [
                  html.tag('span', {class: 'reveal-label'},
                    language.$(capsule, 'reveal')),

                  html.tag('span', {class: 'conceal-label'},
                    {style: 'display: none'},
                    language.$(capsule, 'conceal')),
                ]),

                html.tag('br'),

                html.tag('span', {class: 'warnings'},
                  language.$(capsule, 'warnings', {
                    warnings:
                      language.formatUnitList(
                        unique(slots.revealAllWarnings.filter(Boolean))
                          .sort()
                          .map(warning => html.tag('b', warning))),
                  })),
              ]))),

        stitchArrays({
          classes: slots.classes,
          attributes: slots.itemAttributes,
          image: slots.images,
          link: slots.links,
          name: slots.names,
          info: slots.info,
          tab: slots.tab,

          notFromThisGroup:
            slots.notFromThisGroup ??
            Array.from(slots.links).fill(null)
        }).map(({
            classes,
            attributes,
            image,
            link,
            name,
            info,
            tab,
            notFromThisGroup,
          }, index) =>
            link.slots({
              attributes: [
                link.getSlotValue('attributes'),

                {class: ['grid-item', 'box']},

                tab &&
                !html.isBlank(tab) &&
                  {class: 'has-tab'},

                attributes,

                (classes
                  ? {class: classes}
                  : null),
              ],

              colorContext: 'image-box',

              content: [
                html.tag('span',
                  {[html.onlyIfContent]: true},

                  tab),

                image.slots({
                  thumb: 'medium',
                  square: true,
                  lazy:
                    (typeof slots.lazy === 'number'
                      ? index >= slots.lazy
                   : typeof slots.lazy === 'boolean'
                      ? slots.lazy
                      : false),
                }),

                html.tag('span',
                  {[html.onlyIfContent]: true},

                  (notFromThisGroup
                    ? language.encapsulate('misc.coverGrid.details.notFromThisGroup', capsule =>
                        language.$(capsule, {
                          name,
                          marker:
                            html.tag('span', {class: 'grid-name-marker'},
                              language.$(capsule, 'marker')),
                        }))
                    : language.sanitize(name))),

                html.tag('span',
                  {[html.onlyIfContent]: true},

                  language.$('misc.coverGrid.details.accent', {
                    [language.onlyIfOptions]: ['details'],

                    details: info,
                  })),
              ],
            })),

        relations.actionLinks
          .slot('actionLinks', slots.actionLinks),
      ]),
};
