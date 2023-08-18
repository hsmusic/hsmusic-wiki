import {stitchArrays} from '#sugar';

import {
  filterByCount,
  filterMultipleArrays,
  sortByCount,
  sortChronologically,
} from '#wiki-data';

export default {
  contentDependencies: ['generateListingPage', 'linkAlbum', 'linkTrack'],
  extraDependencies: ['language', 'wikiData'],

  sprawl({albumData}) {
    return {albumData};
  },

  query({albumData}, spec) {
    const albums = sortChronologically(albumData.slice());

    const tracks =
      albums.map(album =>
        album.tracks.slice());

    const durations =
      tracks.map(tracks =>
        tracks.map(track =>
          track.duration));

    // Filter out tracks without any duration.
    // Sort at the same time, to avoid redundantly stitching again later.
    const stitched = stitchArrays({tracks, durations});
    for (const {tracks, durations} of stitched) {
      filterByCount(tracks, durations);
      sortByCount(tracks, durations, {greatestFirst: true});
    }

    // Filter out albums which don't have at least two (remaining) tracks.
    // If the album only has one track in the first place, or if only one
    // has any duration, then there aren't any comparisons to be made and
    // it just takes up space on the listing page.
    const numTracks = tracks.map(tracks => tracks.length);
    filterMultipleArrays(albums, tracks, durations, numTracks,
      (album, tracks, durations, numTracks) =>
        numTracks >= 2);

    return {spec, albums, tracks, durations};
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
    };
  },

  data(query) {
    return {
      durations: query.durations,
    };
  },

  generate(data, relations, {language}) {
    return relations.page.slots({
      type: 'chunks',

      chunkTitles:
        relations.albumLinks
          .map(albumLink => ({album: albumLink})),

      chunkRows:
        stitchArrays({
          trackLinks: relations.trackLinks,
          durations: data.durations,
        }).map(({trackLinks, durations}) =>
            stitchArrays({
              trackLink: trackLinks,
              duration: durations,
            }).map(({trackLink, duration}) => ({
                track: trackLink,
                duration: language.formatDuration(duration),
              }))),
    });
  },
};
