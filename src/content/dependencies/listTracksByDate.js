import {sortAlbumsTracksChronologically} from '#sort';
import {chunkByProperties, stitchArrays} from '#sugar';

export default {
  contentDependencies: ['generateListingPage', 'linkAlbum', 'linkTrack'],
  extraDependencies: ['language', 'wikiData'],

  sprawl: ({trackData}) => ({trackData}),

  query({trackData}, spec) {
    const query = {spec};

    query.tracks =
      sortAlbumsTracksChronologically(
        trackData.filter(track => track.date));

    query.chunks =
      chunkByProperties(query.tracks, ['album', 'date']);

    return query;
  },

  relations: (relation, query) => ({
    page:
      relation('generateListingPage', query.spec),

    albumLinks:
      query.chunks
        .map(({album}) => relation('linkAlbum', album)),

    trackLinks:
      query.chunks
        .map(({chunk}) => chunk
          .map(track => relation('linkTrack', track))),
  }),

  data: (query) => ({
    dates:
      query.chunks
        .map(({date}) => date),

    rereleases:
      query.chunks
        .map(({chunk}) => chunk
          .map(track =>
            // Check if the index of this track...
            query.tracks.indexOf(track) >
            // ...is greater than the *smallest* index
            // of any of this track's *other* releases.
            // (It won't be greater than its own index,
            // so we can use otherReleases here, rather
            // than allReleases.)
            Math.min(...
              track.otherReleases.map(t => query.tracks.indexOf(t))))),
  }),

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
