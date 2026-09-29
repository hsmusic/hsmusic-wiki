export default {
  relations: (relation, tile) => ({
    updateAttributes:
      relation('generateCoverCarouselAlbumTileUpdateAttributes', tile),

    tiles:
      tile.rotateFromAlbums
        .map(album => relation('generateCoverCarouselAlbumTile', album)),
  }),

  generate: (relations, {html}) =>
    html.tag('div', {class: ['carousel-tile', 'carousel-rotating-tile']},
      relations.updateAttributes,
      relations.tiles),
};
