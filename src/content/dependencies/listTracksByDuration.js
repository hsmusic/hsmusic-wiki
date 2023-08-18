import {stitchArrays} from '#sugar';
import {filterByCount, sortAlphabetically, sortByCount} from '#wiki-data';

export default {
  contentDependencies: ['generateListingPage', 'linkTrack'],
  extraDependencies: ['language', 'wikiData'],

  sprawl({trackData}) {
    return {trackData};
  },

  query({trackData}, spec) {
    const tracks = sortAlphabetically(trackData.slice());
    const durations = tracks.map(track => track.duration);

    filterByCount(tracks, durations);
    sortByCount(tracks, durations, {greatestFirst: true});

    return {spec, tracks, durations};
  },

  relations(relation, query) {
    return {
      page: relation('generateListingPage', query.spec),

      trackLinks:
        query.tracks
          .map(track => relation('linkTrack', track)),
    };
  },

  data(query) {
    return {
      durations: query.durations,
    };
  },

  generate(data, relations, {language}) {
    return relations.page.slots({
      type: 'rows',
      rows:
        stitchArrays({
          link: relations.trackLinks,
          duration: data.durations,
        }).map(({link, duration}) => ({
            track: link,
            duration: language.formatDuration(duration),
          })),
    });
  },
};
