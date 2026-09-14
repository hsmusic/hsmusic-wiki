import {repeat} from '#sugar';
import {getCarouselLayoutForNumberOfItems} from '#wiki-data';

export default {
  relations: (relation, carousel) => ({
    tiles:
      carousel.tiles
        .map(tile => relation('generateCoverCarouselTile', tile)),
  }),

  data: (carousel) => ({
    seedSuffix:
      carousel.seedSuffix,
  }),

  slots: {
    lazy: {validate: v => v.anyOf(v.isWholeNumber, v.isBoolean)},
  },

  generate(data, relations, slots, {html}) {
    const layout = getCarouselLayoutForNumberOfItems(relations.tiles.length);

    return html.tags([
      html.tag('div', {class: 'carousel-container'},
        {'data-carousel-rows': layout.rows},
        {'data-carousel-columns': layout.columns},

        data.seedSuffix &&
          {'data-carousel-seed-suffix': data.seedSuffix},

        repeat(3, [
          html.tag('div', {class: 'carousel-grid'},
            {'aria-hidden': 'true'},

            relations.tiles.map((tile, index) =>
              tile.slots({
                lazy:
                  (typeof slots.lazy === 'number'
                    ? index >= slots.lazy
                 : typeof slots.lazy === 'boolean'
                    ? slots.lazy
                    : false),
              }))),
        ])),
    ]);
  },
};
