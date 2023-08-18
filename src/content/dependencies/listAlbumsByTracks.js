import {stitchArrays} from '#sugar';

import {
  filterByCount,
  sortAlphabetically,
  sortByCount,
} from '#wiki-data';

export default {
  contentDependencies: ['generateListingPage', 'linkAlbum'],
  extraDependencies: ['language', 'wikiData'],

  sprawl({albumData}) {
    return {albumData};
  },

  query({albumData}, spec) {
    const albums = sortAlphabetically(albumData.slice());
    const counts = albums.map(album => album.tracks.length);

    filterByCount(albums, counts);
    sortByCount(albums, counts, {greatestFirst: true});

    return {spec, albums, counts};
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
      counts: query.counts,
    };
  },

  generate(data, relations, {language}) {
    return relations.page.slots({
      type: 'rows',
      rows:
        stitchArrays({
          link: relations.albumLinks,
          count: data.counts,
        }).map(({link, count}) => ({
            album: link,
            tracks: language.countTracks(count, {unit: true}),
          })),
    });
  },
};
