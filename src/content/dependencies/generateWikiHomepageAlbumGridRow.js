import {empty, stitchArrays} from '#sugar';
import {getNewAdditions, getNewReleases} from '#wiki-data';

export default {
  contentDependencies: ['generateCoverGrid', 'image', 'linkAlbum'],
  extraDependencies: ['language', 'wikiData'],

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
                .slice()
                .reverse()
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

    links:
      sprawl.albums
        .map(album => relation('linkAlbum', album)),

    images:
      sprawl.albums
        .map(album =>
          relation('image',
            (album.hasCoverArt
              ? album.coverArtworks[0]
              : null))),
  }),

  data: (sprawl, _row) => ({
    names:
      sprawl.albums
        .map(album => album.name),
  }),

  generate: (data, relations, {language}) =>
    relations.coverGrid.slots({
      links: relations.links,
      names: data.names,

      images:
        stitchArrays({
          image: relations.images,
          name: data.names,
        }).map(({image, name}) =>
            image.slots({
              missingSourceContent:
                language.$('misc.coverGrid.noCoverArt', {
                  album: name,
                }),
              })),
    }),
};
