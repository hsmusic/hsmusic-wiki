import {sortAlphabetically, sortByCount} from '#sort';
import {filterByCount, stitchArrays} from '#sugar';

export default {
  contentDependencies: ['generateListingPage', 'linkAlbum'],
  extraDependencies: ['language', 'wikiData'],

  sprawl({albumData}) {
    return {albumData};
  },

  query({albumData}, spec) {
    const albums =
      sortAlphabetically(
        albumData.filter(album => !album.hideDuration));

    const counts =
      albums.map(album => album.tracks.length);

    filterByCount(albums, counts);
    sortByCount(albums, counts, {greatestFirst: true});

    const styles =
      albums.map(album => album.style);

    return {spec, albums, counts, styles};
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
      styles: query.styles,
    };
  },

  generate(data, relations, {language}) {
    return relations.page.slots({
      type: 'rows',
      rows:
        stitchArrays({
          link: relations.albumLinks,
          count: data.counts,
          style: data.styles,
        }).map(({link, count, style}) => {
            const row = {
              album: link,
              tracks: language.countTracks(count, {unit: true}),
            };

            if (style === 'single') {
              row.stringsKey = 'single';
            }

            return row;
          }),
    });
  },
};
