import {stitchArrays} from '../../util/sugar.js';
import {sortAlphabetically} from '../../util/wiki-data.js';

export default {
  contentDependencies: ['generateListingPage', 'linkAlbum'],
  extraDependencies: ['language', 'wikiData'],

  sprawl({albumData}) {
    return {albumData};
  },

  query({albumData}) {
    return {
      albums: sortAlphabetically(albumData.slice()),
    };
  },

  relations(relation, query) {
    return {
      page: relation('generateListingPage'),
      links: query.albums.map(album => relation('linkAlbum', album)),
    };
  },

  data(query) {
    return {
      numTracks: query.albums.map(album => album.tracks.length),
    };
  },

  generate(data, relations, {language}) {
    return relations.page.slots({
      title: language.$('listingPage.listAlbums.byName.title'),
      type: 'rows',
      rows:
        stitchArrays({
          link: relations.links,
          numTracks: data.numTracks,
        }).map(({link, numTracks}) =>
            language.$('listingPage.listAlbums.byName.item', {
              album: link,
              tracks: language.countTracks(numTracks, {unit: true}),
            })),
    });
  },
};
