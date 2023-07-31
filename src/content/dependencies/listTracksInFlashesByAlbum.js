import {empty, stitchArrays} from '../../util/sugar.js';
import {filterMultipleArrays, sortChronologically} from '../../util/wiki-data.js';

export default {
  contentDependencies: ['generateListingPage', 'linkAlbum', 'linkFlash', 'linkTrack'],
  extraDependencies: ['language', 'wikiData'],

  sprawl({albumData}) {
    return {albumData};
  },

  query({albumData}, spec) {
    const albums = sortChronologically(albumData.slice());

    const tracks =
      albums.map(album =>
        album.tracks.slice());

    const flashes =
      tracks.map(tracks =>
        tracks.map(track =>
          track.featuredInFlashes));

    // Filter out tracks that aren't featured in any flashes.
    // This listing doesn't perform any sorting within albums.
    const stitched = stitchArrays({tracks, flashes});
    for (const {tracks, flashes} of stitched) {
      filterMultipleArrays(tracks, flashes,
        (tracks, flashes) => !empty(flashes));
    }

    // Filter out albums which don't have at least one remaining track.
    filterMultipleArrays(albums, tracks, flashes,
      (album, tracks, _flashes) => !empty(tracks));

    return {spec, albums, tracks, flashes};
  },

  relations(relation, query) {
    return {
      page: relation('generateListingPage', query.spec),

      albumLinks:
        query.albums
          .map(album => relation('linkAlbum', album)),

      trackLinks:
        query.tracks
          .map(tracks => tracks
            .map(track => relation('linkTrack', track))),

      flashLinks:
        query.flashes
          .map(flashesByAlbum => flashesByAlbum
            .map(flashesByTrack => flashesByTrack
              .map(flash => relation('linkFlash', flash)))),
    };
  },

  generate(relations, {language}) {
    return relations.page.slots({
      type: 'chunks',

      chunkTitles:
        relations.albumLinks
          .map(albumLink => ({album: albumLink})),

      chunkRows:
        stitchArrays({
          trackLinks: relations.trackLinks,
          flashLinks: relations.flashLinks,
        }).map(({trackLinks, flashLinks}) =>
            stitchArrays({
              trackLink: trackLinks,
              flashLinks: flashLinks,
            }).map(({trackLink, flashLinks}) => ({
                track: trackLink,
                flashes: language.formatConjunctionList(flashLinks),
              }))),
    });
  },
};
