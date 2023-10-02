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
    images: {validate: v => v.strictArrayOf(v.isHTML)},
    links: {validate: v => v.strictArrayOf(v.isHTML)},
    names: {validate: v => v.strictArrayOf(v.isHTML)},
    info: {validate: v => v.strictArrayOf(v.isHTML)},

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

    lazy: {validate: v => v.anyOf(v.isWholeNumber, v.isBoolean)},
    actionLinks: {validate: v => v.sparseArrayOf(v.isHTML)},
  },

  generate(relations, slots, {html, language}) {
    return (
      html.tag('div', {class: 'grid-listing'}, [
        stitchArrays({
          classes: slots.classes,
          image: slots.images,
          link: slots.links,
          name: slots.names,
          info: slots.info,
        }).map(({classes, image, link, name, info}, index) =>
            link.slots({
              attributes: [
                {class: ['grid-item', 'box']},

                (classes
                  ? {class: classes}
                  : null),
              ],

              colorContext: 'image-box',

              content: [
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

                html.tag('span', {[html.onlyIfContent]: true},
                  language.sanitize(name)),

                html.tag('span', {[html.onlyIfContent]: true},
                  language.sanitize(info)),
              ],
            })),

        relations.actionLinks
          .slot('actionLinks', slots.actionLinks),
      ]));
  },
};
