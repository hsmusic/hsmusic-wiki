import {empty, stitchArrays} from '#sugar';
import {filterMultipleArrays, sortChronologically} from '#wiki-data';

export default {
  contentDependencies: ['generateListingPage', 'linkAlbum', 'linkTrack'],
  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({albumData}) {
    return {albumData};
  },

  query(sprawl, spec, property, valueMode) {
    const albums =
      sortChronologically(sprawl.albumData.slice());

    const tracks =
      albums
        .map(album =>
          album.tracks
            .filter(track => {
              switch (valueMode) {
                case 'truthy': return !!track[property];
                case 'array': return !empty(track[property]);
                default: return false;
              }
            }));

    filterMultipleArrays(albums, tracks,
      (album, tracks) => !empty(tracks));

    return {spec, albums, tracks};
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
      dates:
        query.albums.map(album => album.date),
    };
  },

  slots: {
    hash: {type: 'string'},
  },

  generate(data, relations, slots, {language}) {
    return relations.page.slots({
      type: 'chunks',

      chunkTitles:
        stitchArrays({
          albumLink: relations.albumLinks,
          date: data.dates,
        }).map(({albumLink, date}) => ({
            album: albumLink,
            date: language.formatDate(date),
          })),

      chunkRows:
        relations.trackLinks
          .map(trackLinks => trackLinks
            .map(trackLink => ({
              track: trackLink.slot('hash', slots.hash),
            }))),
    });
  },
};
