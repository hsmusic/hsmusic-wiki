export default {
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

      chunkRows:
        relations.trackLinks
          .map(trackLinks => trackLinks
            .map(trackLink => ({track: trackLink}))),
    });
  },
};
