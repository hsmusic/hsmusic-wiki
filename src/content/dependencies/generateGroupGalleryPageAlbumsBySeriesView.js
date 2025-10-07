export default {
  relations: (relation, group) => ({
    seriesSections:
      group.serieses
        .map(series =>
          relation('generateGroupGalleryPageSeriesSection', series)),
  }),

  slots: {
    attributes: {
      type: 'attributes',
      mutable: false,
    },
  },

  generate: (relations, slots, {html}) =>
    html.tag('div', {id: 'group-album-gallery-by-series'},
      slots.attributes,

      {[html.onlyIfContent]: true},

      relations.seriesSections),
};
