import {empty} from '#sugar';

export default {
  relations: (relation, carousel) => ({
    regularGrid:
      relation('generateCoverCarouselGrid', carousel.tiles),

    scriptlessGrid:
      (empty(carousel.scriptlessTiles)
        ? null
        : relation('generateCoverCarouselGrid', carousel.scriptlessTiles)),
  }),

  data: (carousel) => ({
    seedSuffix:
      carousel.seedSuffix,
  }),

  generate: (data, relations, {html}) =>
    html.tag('div', {class: 'carousel-container'},
      data.seedSuffix &&
        {'data-carousel-seed-suffix': data.seedSuffix},

      html.tag('noscript', {[html.onlyIfContent]: true},
        relations.scriptlessGrid),

      relations.regularGrid),
};
