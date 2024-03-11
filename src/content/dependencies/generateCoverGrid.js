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

    lazy: {validate: v => v.anyOf(v.isWholeNumber, v.isBoolean)},
    actionLinks: {validate: v => v.sparseArrayOf(v.isHTML)},
  },

  generate(relations, slots, {html, language}) {
    return (
      html.tag('div', {class: 'grid-listing'}, slots.attributes, [
        stitchArrays({
          image: slots.images,
          link: slots.links,
          name: slots.names,
          info: slots.info,
        }).map(({image, link, name, info}, index) =>
            link.slots({
              attributes:
                html.attributes([
                  link.getSlotValue('attributes'),
                  {class: ['grid-item', 'box']},
                ]),

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
