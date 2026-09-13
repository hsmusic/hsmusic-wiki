export default {
  relations: (relation, tile) => ({
    link:
      relation('linkAlbum', tile.album),

    image:
      relation('image', tile.album.coverArtworks[0]),
  }),

  slots: {
    lazy: {type: 'boolean', default: false},
  },

  generate: (relations, slots, {html}) =>
    html.tag('div', {class: 'carousel-item'},
      relations.link.slots({
        attributes: {tabindex: '-1'},
        content:
          relations.image.slots({
            thumb: 'small',
            lazy: slots.lazy,
          }),
      })),
};
