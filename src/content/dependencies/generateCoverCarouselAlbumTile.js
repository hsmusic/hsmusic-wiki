export default {
  relations: (relation, album) => ({
    link:
      relation('linkAlbum', album),

    image:
      relation('image', album.coverArtworks[0]),
  }),

  slots: {
    attributes: {type: 'attributes', mutable: false},
    lazy: {type: 'boolean', default: false},
  },

  generate: (relations, slots, {html}) =>
    html.tag('div', {class: ['carousel-tile', 'carousel-album-tile']},
      slots.attributes,

      relations.link.slots({
        attributes: {tabindex: '-1'},
        content:
          relations.image.slots({
            thumb: 'small',
            lazy: slots.lazy,
          }),
      })),
};
