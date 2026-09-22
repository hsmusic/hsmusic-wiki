import {getCarouselLayoutForNumberOfItems} from '#wiki-data';

export default {
  relations: (relation, tiles) => ({
    tiles:
      tiles
        .map(tile => relation('generateCoverCarouselTile', tile)),
  }),

  data: (tiles) => ({
    layout:
      getCarouselLayoutForNumberOfItems(tiles.length),
  }),

  generate: (data, relations, {html}) =>
    html.tag('div', {class: 'carousel-grid'},
      {'data-carousel-rows': data.layout.rows},
      {'data-carousel-columns': data.layout.columns},
      relations.tiles),
};
