import {empty} from '#sugar';
import {getNewAdditions, getNewReleases} from '#wiki-data';

export default {
  sprawl({albumData}, row) {
    const sprawl = {};

    switch (row.sourceGroup) {
      case 'new-releases':
        sprawl.albums = getNewReleases(row.countAlbumsFromGroup, {albumData});
        break;

      case 'new-additions':
        sprawl.albums = getNewAdditions(row.countAlbumsFromGroup, {albumData});
        break;

      default:
        sprawl.albums =
          (row.sourceGroup
            ? row.sourceGroup.albums
                .toReversed()
                .filter(album => album.isListedOnHomepage)
                .slice(0, row.countAlbumsFromGroup)
            : []);
    }

    if (!empty(row.sourceAlbums)) {
      sprawl.albums.push(...row.sourceAlbums);
    }

    return sprawl;
  },

  relations: (relation, sprawl, _row) => ({
    coverGrid:
      relation('generateCoverGrid'),

    coverGridItems:
      sprawl.albums.map(album =>
        relation('generateCoverGridItem',
          (album.hasCoverArt
            ? album.coverArtworks[0]
            : album))),
  }),

  generate: (relations, {html}) =>
    relations.coverGrid.slots({
      allWarnings: [],

      items:
        relations.coverGridItems
          .map(item => item.slot('details', html.blank())),
    }),
};
