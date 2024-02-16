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
          sortAlbumsTracksChronologically(trackData.slice()),
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

      rereleases:
        query.chunks.map(({chunk}) =>
          chunk.map(track =>
            track.originalReleaseTrack !== null)),
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
          rereleases: data.rereleases,
        }).map(({trackLinks, rereleases}) =>
            stitchArrays({
              trackLink: trackLinks,
              rerelease: rereleases,
            }).map(({trackLink, rerelease}) =>
                (rerelease
                  ? {stringsKey: 'rerelease', track: trackLink}
                  : {track: trackLink}))),

      chunkRowAttributes:
        data.rereleases.map(rereleases =>
          rereleases.map(rerelease =>
            (rerelease
              ? {class: 'rerelease'}
              : null))),
    });
  },
};
