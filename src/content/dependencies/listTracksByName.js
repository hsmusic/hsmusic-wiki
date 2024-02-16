import {sortAlphabetically} from '#sort';

export default {
  contentDependencies: ['generateListingPage', 'linkTrack'],
  extraDependencies: ['wikiData'],

  sprawl({trackData}) {
    return {trackData};
  },

  query({trackData}, spec) {
    return {
      spec,
      tracks: sortAlphabetically(trackData.slice()),
    };
  },

  relations(relation, query) {
    return {
      page: relation('generateListingPage', query.spec),

      trackLinks:
        query.tracks
          .map(track => relation('linkTrack', track)),
    };
  },

  generate(relations) {
    return relations.page.slots({
      type: 'rows',
      rows:
        relations.trackLinks
          .map(link => ({track: link})),
    });
  },
};
