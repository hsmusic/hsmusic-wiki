import {stitchArrays} from '#sugar';
import {filterByCount, sortAlphabetically, sortByCount} from '#wiki-data';

export default {
  contentDependencies: ['generateListingPage', 'linkArtist'],
  extraDependencies: ['language', 'wikiData'],

  sprawl({artistData}) {
    return {artistData};
  },

  query({artistData}, spec) {
    const artists = sortAlphabetically(artistData.slice());
    const counts =
      artists.map(artist =>
        artist.tracksAsCommentator.length +
        artist.albumsAsCommentator.length);

    filterByCount(artists, counts);
    sortByCount(artists, counts, {greatestFirst: true});

    return {artists, counts, spec};
  },

  relations(relation, query) {
    return {
      page:
        relation('generateListingPage', query.spec),

      artistLinks:
        query.artists
          .map(artist => relation('linkArtist', artist)),
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
          link: relations.artistLinks,
          count: data.counts,
        }).map(({link, count}) => ({
            artist: link,
            entries: language.countCommentaryEntries(count, {unit: true}),
          })),
    });
  },
};
