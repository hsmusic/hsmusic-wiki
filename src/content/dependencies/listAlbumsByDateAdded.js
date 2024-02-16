import {sortAlphabetically} from '#sort';
import {chunkByProperties} from '#sugar';

export default {
  contentDependencies: ['generateListingPage', 'linkAlbum'],
  extraDependencies: ['language', 'wikiData'],

  sprawl({albumData}) {
    return {albumData};
  },

  query({albumData}, spec) {
    return {
      spec,

      chunks:
        chunkByProperties(
          sortAlphabetically(albumData.filter(a => a.dateAddedToWiki))
            .sort((a, b) => {
              if (a.dateAddedToWiki < b.dateAddedToWiki) return -1;
              if (a.dateAddedToWiki > b.dateAddedToWiki) return 1;
            }),
          ['dateAddedToWiki']),
    };
  },

  relations(relation, query) {
    return {
      page: relation('generateListingPage', query.spec),

      albumLinks:
        query.chunks.map(({chunk}) =>
          chunk.map(album => relation('linkAlbum', album))),
    };
  },

  data(query) {
    return {
      dates:
        query.chunks.map(({dateAddedToWiki}) => dateAddedToWiki),
    };
  },

  generate(data, relations, {language}) {
    return relations.page.slots({
      type: 'chunks',

      chunkTitles:
        data.dates.map(date => ({
          date: language.formatDate(date),
        })),

      chunkRows:
        relations.albumLinks.map(albumLinks =>
          albumLinks.map(link => ({
            album: link,
          }))),
    });
  },
};
