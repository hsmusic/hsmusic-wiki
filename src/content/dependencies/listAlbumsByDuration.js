import {stitchArrays} from '../../util/sugar.js';
import {getTotalDuration} from '../../util/wiki-data.js';

export default {
  contentDependencies: ['generateListingPage', 'linkAlbum'],
  extraDependencies: ['language', 'wikiData'],

  sprawl({albumData}) {
    return {albumData};
  },

  query({albumData}, spec) {
    const albumToDuration =
      new Map(albumData.map(album => [album, getTotalDuration(album.tracks)]));

    return {
      spec,

      albums:
        albumData
          .filter(album => albumToDuration.get(album) > 0)
          .sort((a, b) => albumToDuration.get(b) - albumToDuration.get(a)),
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
      durations:
        query.albums
          .map(album => getTotalDuration(album.tracks)),
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
