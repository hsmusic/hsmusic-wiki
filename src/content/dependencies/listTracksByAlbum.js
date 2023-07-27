export default {
  contentDependencies: ['generateListingPage', 'linkAlbum', 'linkTrack'],
  extraDependencies: ['language', 'wikiData'],

  sprawl({albumData}) {
    return {albumData};
  },

  query({albumData}, spec) {
    return {
      spec,
      albums: albumData,
      tracks: albumData.map(album => album.tracks),
    };
  },

  relations(relation, query) {
    return {
      page: relation('generateListingPage', query.spec),

      albumLinks:
        query.albums
          .map(album => relation('linkAlbum', album)),

      trackLinks:
        query.tracks
          .map(tracks => tracks
            .map(track => relation('linkTrack', track))),
    };
  },

  generate(relations) {
    return relations.page.slots({
      type: 'chunks',

      chunkTitles:
        relations.albumLinks
          .map(albumLink => ({album: albumLink})),

      listStyle: 'ordered',

      chunkRows:
        relations.trackLinks
          .map(trackLinks => trackLinks
            .map(trackLink => ({track: trackLink}))),
    });
  },
};
