export default {
  relations: (relation, tile) => ({
    tiles:
      tile.randomizeFromAlbums
        .map(album => relation('generateCoverCarouselAlbumTile', album)),
  }),

  slots: {
    attributes: {type: 'attributes', mutable: false},
    lazy: {type: 'boolean', default: false},
  },

  generate(relations, slots, {html}) {
    for (const [index, tile] of relations.tiles.entries()) {
      tile.setSlot('lazy', slots.lazy);

      if (index >= 1) {
        tile.setSlot('attributes', {style: 'display: none'});
      }
    }

    return (
      html.tag('div', {class: ['carousel-tile', 'carousel-randomized-tile']},
        slots.attributes,
        relations.tiles)
    );
  },
};
