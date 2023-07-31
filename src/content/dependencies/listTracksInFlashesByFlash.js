import {empty, stitchArrays} from '../../util/sugar.js';
import {sortFlashesChronologically} from '../../util/wiki-data.js';

export default {
  contentDependencies: ['generateListingPage', 'linkAlbum', 'linkFlash', 'linkTrack'],
  extraDependencies: ['wikiData'],

  sprawl({flashData}) {
    return {flashData};
  },

  query({flashData}, spec) {
    const flashes = sortFlashesChronologically(
      flashData
        .filter(flash => !empty(flash.featuredTracks)));

    const tracks =
      flashes.map(album => album.featuredTracks);

    const albums =
      tracks.map(tracks =>
        tracks.map(track => track.album));

    return {spec, flashes, tracks, albums};
  },

  relations(relation, query) {
    return {
      page: relation('generateListingPage', query.spec),

      flashLinks:
        query.flashes
          .map(flash => relation('linkFlash', flash)),

      trackLinks:
        query.tracks
          .map(tracks => tracks
            .map(track => relation('linkTrack', track))),

      albumLinks:
        query.albums
          .map(albums => albums
            .map(album => relation('linkAlbum', album))),
    };
  },

  generate(relations) {
    return relations.page.slots({
      type: 'chunks',

      chunkTitles:
        relations.flashLinks
          .map(flashLink => ({flash: flashLink})),

      chunkRows:
        stitchArrays({
          trackLinks: relations.trackLinks,
          albumLinks: relations.albumLinks,
        }).map(({trackLinks, albumLinks}) =>
            stitchArrays({
              trackLink: trackLinks,
              albumLink: albumLinks,
            }).map(({trackLink, albumLink}) => ({
                track: trackLink,
                album: albumLink,
              }))),
    });
  },
};
