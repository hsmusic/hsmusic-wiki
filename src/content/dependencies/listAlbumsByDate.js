import {stitchArrays} from '../../util/sugar.js';
import {sortChronologically} from '../../util/wiki-data.js';

export default {
  contentDependencies: ['generateListingPage', 'linkAlbum'],
  extraDependencies: ['language', 'wikiData'],

  sprawl({albumData}) {
    return {albumData};
  },

  query({albumData}, spec) {
    return {
      spec,

      albums:
        sortChronologically(albumData.filter(album => album.date)),
    };
  },

  relations(relation, query) {
    return {
      page: relation('generateListingPage', query.spec),

      albumLinks:
        query.albums
          .map(album => relation('linkAlbum', album)),
    };
  },

  data(query) {
    return {
      dates:
        query.albums
          .map(album => album.date),
    };
  },

  generate(data, relations, {language}) {
    return relations.page.slots({
      type: 'rows',
      rows:
        stitchArrays({
          link: relations.albumLinks,
          date: data.dates,
        }).map(({link, date}) => ({
            album: link,
            date: language.formatDate(date),
          })),
    });
  },
};
