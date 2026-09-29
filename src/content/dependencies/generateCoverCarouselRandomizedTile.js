export default {
  relations: (relation, tile) => ({
    updateAttributes:
      relation('generateCoverCarouselAlbumTileUpdateAttributes', tile),

    tiles:
      tile.randomizeFromAlbums
        .map(album => relation('generateCoverCarouselAlbumTile', album)),
  }),

  generate: (relations, {html}) =>
    html.tag('div', {class: ['carousel-tile', 'carousel-randomized-tile']},
      relations.updateAttributes,
      relations.tiles),
};
