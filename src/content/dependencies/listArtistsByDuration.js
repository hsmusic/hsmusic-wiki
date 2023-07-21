import {stitchArrays} from '../../util/sugar.js';

import {
  filterByCount,
  getTotalDuration,
  sortAlphabetically,
  sortByCount,
} from '../../util/wiki-data.js';

export default {
  contentDependencies: ['generateListingPage', 'linkArtist'],
  extraDependencies: ['language', 'wikiData'],

  sprawl({artistData}) {
    return {artistData};
  },

  query({artistData}, spec) {
    const artists = sortAlphabetically(artistData.slice());
    const durations = artists.map(artist =>
      getTotalDuration([
        ...(artist.tracksAsArtist ?? []),
        ...(artist.tracksAsContributor ?? []),
      ], {originalReleasesOnly: true}));

    filterByCount(artists, durations);
    sortByCount(artists, durations, {greatestFirst: true});

    return {spec, artists, durations};
  },

  relations(relation, query) {
    return {
      page: relation('generateListingPage', query.spec),

      artistLinks:
        query.artists
          .map(artist => relation('linkArtist', artist)),
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
          link: relations.artistLinks,
          duration: data.durations,
        }).map(({link, duration}) => ({
            artist: link,
            duration: language.formatDuration(duration),
          })),
    });
  },
};
