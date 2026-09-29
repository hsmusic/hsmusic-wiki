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

    updateFrequency:
      carousel.updateFrequency,

    anchorDate:
      carousel.anchorDate,
  }),

  generate: (data, relations, {html}) =>
    html.tag('div', {class: 'carousel-container'},
      data.seedSuffix &&
        {'data-carousel-seed-suffix': data.seedSuffix},

      {'data-update-frequency': data.updateFrequency},
      {'data-anchor-date': data.anchorDate.toISOString().slice(0, 10)},

      html.tag('noscript', {[html.onlyIfContent]: true},
        relations.scriptlessGrid),

      relations.regularGrid),
};
