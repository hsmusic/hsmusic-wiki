export default {
  sprawl({albumData}) {
    return {albumData};
  },

  query({albumData}, spec) {
    return {
      spec,
      albums: albumData,
    };
  },

  relations(relation, query) {
    return {
      page: relation('generateListingPage', query.spec),

      albumLinks:
        query.albums
          .map(album => relation('linkAlbum', album)),

      albumColorStyles:
        query.albums
          .map(album => relation('generateColorStyleAttribute', album.color)),

      albumTrackLists:
        query.albums
          .map(album => relation('generateAlbumTrackList', album)),
    };
  },

  data(query) {
    return {
      albumsHaveTrackNumbers:
        query.albums
          .map(album => album.hasTrackNumbers),
    };
  },

  generate(data, relations) {
    return relations.page.slots({
      type: 'chunks',

      chunkTitles:
        relations.albumLinks
          .map(albumLink => ({album: albumLink})),

      chunkListStyles:
        data.albumsHaveTrackNumbers
          .map(hasTrackNumbers => hasTrackNumbers ? 'ordered' : 'unordered'),

      chunkListAttributes:
        relations.albumColorStyles
          .map(style => style.slot('context', 'primary-only')),

      chunkContent:
        relations.albumTrackLists
          .map(list => list.slots({
            showArtists: false,
            showDuration: false,
            showTrackSections: 'divided',
          })),
    });
  },
};
