import {stitchArrays} from '#sugar';
import {filterByCount, sortAlbumsTracksChronologically, sortByCount} from '#wiki-data';

export default {
  contentDependencies: ['generateListingPage', 'linkTrack'],
  extraDependencies: ['language', 'wikiData'],

  sprawl({trackData}) {
    return {trackData};
  },

  query({trackData}, spec) {
    const tracks = sortAlbumsTracksChronologically(trackData.slice());
    const timesReferenced = tracks.map(track => track.referencedByTracks.length);

    filterByCount(tracks, timesReferenced);
    sortByCount(tracks, timesReferenced, {greatestFirst: true});

    return {spec, tracks, timesReferenced};
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
      timesReferenced: query.timesReferenced,
    };
  },

  generate(data, relations, {language}) {
    return relations.page.slots({
      type: 'rows',
      rows:
        stitchArrays({
          link: relations.trackLinks,
          timesReferenced: data.timesReferenced,
        }).map(({link, timesReferenced}) => ({
            track: link,
            timesReferenced:
              language.countTimesReferenced(timesReferenced, {unit: true}),
          })),
    });
  },
};
