import {stitchArrays} from '#sugar';

export default {
  contentDependencies: ['generateGridActionLinks'],
  extraDependencies: ['html'],

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

    lazy: {validate: v => v.oneOf(v.isWholeNumber, v.isBoolean)},
    actionLinks: {validate: v => v.sparseArrayOf(v.isHTML)},
  },

  generate(relations, slots, {html}) {
    return (
      html.tag('div', {class: 'grid-listing'}, [
        stitchArrays({
          image: slots.images,
          link: slots.links,
          name: slots.names,
          info: slots.info,
        }).map(({image, link, name, info}, index) =>
            link.slots({
              attributes: {class: ['grid-item', 'box']},
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
                html.tag('span', {[html.onlyIfContent]: true}, name),
                html.tag('span', {[html.onlyIfContent]: true}, info),
              ],
            })),

        relations.actionLinks
          .slot('actionLinks', slots.actionLinks),
      ]));
  },
};
