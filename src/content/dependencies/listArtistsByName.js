import {stitchArrays} from '../../util/sugar.js';

import {
  getArtistNumContributions,
  sortAlphabetically,
} from '../../util/wiki-data.js';

export default {
  contentDependencies: ['generateListingPage', 'linkArtist'],
  extraDependencies: ['language', 'wikiData'],

  sprawl({artistData}) {
    return {artistData};
  },

  query({artistData}, spec) {
    return {
      spec,

      artists: sortAlphabetically(artistData.slice()),
    };
  },

  relations(relation, query) {
    return {
      page: relation('generateListingPage', query.spec),

      artistLinks:
        query.artists
          .map(album => relation('linkArtist', album)),
    };
  },

  data(query) {
    return {
      counts:
        query.artists
          .map(artist => getArtistNumContributions(artist)),
    };
  },

  generate(data, relations, {language}) {
    return relations.page.slots({
      type: 'rows',
      rows:
        stitchArrays({
          link: relations.artistLinks,
          count: data.counts,
        }).map(({link, count}) => ({
            artist: link,
            contributions: language.countContributions(count, {unit: true}),
          })),
    });
  },
};
