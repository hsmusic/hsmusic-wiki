import {stitchArrays} from '../../util/sugar.js';

import {
  filterByCount,
  getTotalDuration,
  sortAlphabetically,
  sortByCount,
} from '../../util/wiki-data.js';

export default {
  contentDependencies: ['generateListingPage', 'linkAlbum'],
  extraDependencies: ['language', 'wikiData'],

  sprawl({albumData}) {
    return {albumData};
  },

  query({albumData}, spec) {
    const albums = sortAlphabetically(albumData.slice());
    const durations = albums.map(album => getTotalDuration(album.tracks));

    filterByCount(albums, durations);
    sortByCount(albums, durations, {greatestFirst: true});

    return {spec, albums, durations};
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
      durations: query.durations,
    };
  },

  generate(data, relations, {language}) {
    return relations.page.slots({
      type: 'rows',
      rows:
        stitchArrays({
          link: relations.albumLinks,
          duration: data.durations,
        }).map(({link, duration}) => ({
            album: link,
            duration: language.formatDuration(duration),
          })),
    });
  },
};
