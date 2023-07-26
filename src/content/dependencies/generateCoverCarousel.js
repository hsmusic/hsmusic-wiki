import {empty, repeat, stitchArrays} from '../../util/sugar.js';
import {getCarouselLayoutForNumberOfItems} from '../../util/wiki-data.js';

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

    lazy: {validate: v => v.oneOf(v.isWholeNumber, v.isBoolean)},
    actionLinks: {validate: v => v.sparseArrayOf(v.isHTML)},
  },

  generate(relations, slots, {html}) {
    const stitched =
      stitchArrays({
        image: slots.images,
        link: slots.links,
      });

    if (empty(stitched)) {
      return;
    }

    const layout = getCarouselLayoutForNumberOfItems(stitched.length);

    return html.tags([
      html.tag('div',
        {
          class: 'carousel-container',
          'data-carousel-rows': layout.rows,
          'data-carousel-columns': layout.columns,
        },
        repeat(3, [
          html.tag('div',
            {class: 'carousel-grid', 'aria-hidden': 'true'},
            stitched.map(({image, link}, index) =>
              html.tag('div', {class: 'carousel-item'},
                link.slots({
                  attributes: {tabindex: '-1'},
                  content:
                    image.slots({
                      thumb: 'small',
                      square: true,
                      lazy:
                        (typeof slots.lazy === 'number'
                          ? index >= slots.lazy
                       : typeof slots.lazy === 'boolean'
                          ? slots.lazy
                          : false),
                    }),
                })))),
        ])),

      relations.actionLinks
        .slot('actionLinks', slots.actionLinks),
    ]);
  },
};
