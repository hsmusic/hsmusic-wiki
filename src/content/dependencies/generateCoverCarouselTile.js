import {empty} from '#sugar';

export default {
  relations: (relation, tile) => ({
    tile:
      (!empty(tile.randomizeFromAlbums)
        ? relation('generateCoverCarouselRandomizedTile', tile)
     : tile.album
        ? relation('generateCoverCarouselAlbumTile', tile.album)
        : null),
  }),

  generate: (relations) => relations.tile,
};
