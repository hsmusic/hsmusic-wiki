import {sortAlbumsTracksChronologically} from '#sort';
import {chunkByProperties, stitchArrays} from '#sugar';

export default {
  contentDependencies: ['generateListingPage', 'linkAlbum', 'linkTrack'],
  extraDependencies: ['language', 'wikiData'],

  sprawl({trackData}) {
    return {trackData};
  },

  query({trackData}, spec) {
    return {
      spec,

      chunks:
        chunkByProperties(
          sortAlbumsTracksChronologically(
            trackData.filter(track => track.date)),
          ['album', 'date']),
    };
  },

  relations(relation, query) {
    return {
      page: relation('generateListingPage', query.spec),

      albumLinks:
        query.chunks
          .map(({album}) => relation('linkAlbum', album)),

      trackLinks:
        query.chunks
          .map(({chunk}) => chunk
            .map(track => relation('linkTrack', track))),
    };
  },

  data(query) {
    return {
      dates:
        query.chunks
          .map(({date}) => date),

      secreleases:
        query.chunks.map(({chunk}) =>
          chunk.map(track =>
            track.mainReleaseTrack !== null)),
    };
  },

  generate(data, relations, {language}) {
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
        stitchArrays({
          trackLinks: relations.trackLinks,
          secreleases: data.secreleases,
        }).map(({trackLinks, secreleases}) =>
            stitchArrays({
              trackLink: trackLinks,
              secrelease: secreleases,
            }).map(({trackLink, secrelease}) =>
                (secrelease
                  ? {stringsKey: 'rerelease', track: trackLink}
                  : {track: trackLink}))),

      chunkRowAttributes:
        data.secreleases.map(secreleases =>
          secreleases.map(secrelease =>
            (secrelease
              ? {class: 'rerelease'}
              : null))),
    });
  },
};
