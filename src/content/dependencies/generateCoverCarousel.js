import {empty, repeat, stitchArrays} from '#sugar';
import {getCarouselLayoutForNumberOfItems} from '#wiki-data';

export default {
  slots: {
    images: {validate: v => v.strictArrayOf(v.isHTML)},
    links: {validate: v => v.strictArrayOf(v.isHTML)},

    lazy: {validate: v => v.anyOf(v.isWholeNumber, v.isBoolean)},
  },

  generate(slots, {html}) {
    const stitched =
      stitchArrays({
        image: slots.images,
        link: slots.links,
      });

    if (empty(stitched)) {
      return html.blank();
    }

    const layout = getCarouselLayoutForNumberOfItems(stitched.length);

    return html.tags([
      html.tag('div', {class: 'carousel-container'},
        {'data-carousel-rows': layout.rows},
        {'data-carousel-columns': layout.columns},

        repeat(3, [
          html.tag('div', {class: 'carousel-grid'},
            {'aria-hidden': 'true'},

            stitched.map(({image, link}, index) =>
              html.tag('div', {class: 'carousel-item'},
                link.slots({
                  attributes: {tabindex: '-1'},
                  content:
                    image.slots({
                      thumb: 'small',
                      lazy:
                        (typeof slots.lazy === 'number'
                          ? index >= slots.lazy
                       : typeof slots.lazy === 'boolean'
                          ? slots.lazy
                          : false),
                    }),
                })))),
        ])),
    ]);
  },
};
