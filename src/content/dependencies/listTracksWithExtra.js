import {sortChronologically} from '#sort';
import {empty, filterMultipleArrays, stitchArrays} from '#sugar';

export default {
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

      albumCredits:
        query.albums
          .map(album => relation('generateArtistCredit',
            album.artistContribs,
            [])),

      trackListItems:
        query.tracks
          .map(tracks => tracks
            .map(track => relation('generateTrackListItem',
              track,
              track.album.trackArtistContribs))),
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
    showAlbumDates: {type: 'boolean', default: true},
    showArtists: {type: 'boolean', default: false},
  },

  generate(data, relations, slots, {html, language}) {
    return relations.page.slots({
      type: 'chunks',

      chunkTitles:
        stitchArrays({
          link: relations.albumLinks,
          credit: relations.albumCredits,
          date: data.dates,
        }).map(({link, credit, date}) =>
            language.encapsulate((stringsKey = '') => {
              const options = {album: link};

              // Sorry, this is totally cheating.
              credit.setSlots({
                normalStringKey:
                  'artistPage.creditList.album.credit.by',
              });

              if (slots.showArtists && !html.isBlank(credit)) {
                stringsKey += 'withCredit';
                options.credit = credit;
              }

              if (slots.showAlbumDates && date) {
                stringsKey += stringsKey ? '.' : '';
                stringsKey += 'withDate';
                options.date = language.formatDate(date);
              }

              return {stringsKey, ...options};
            })),

      chunkRows:
        relations.trackListItems
          .map(items => items
            .map(item => ({
              track:
                html.inside(item.slots({
                  showNameDetail: 'from within album',
                  showDuration: false,
                  hash: slots.hash,
                })),
            }))),
    });
  },
};
