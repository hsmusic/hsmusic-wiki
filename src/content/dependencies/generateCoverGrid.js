import {stitchArrays} from '#sugar';

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
  },

  generate: (relations, slots, {html, language}) =>
    html.tag('div', {class: 'grid-listing'},
      slots.attributes,
      {[html.onlyIfContent]: true},

      [
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
