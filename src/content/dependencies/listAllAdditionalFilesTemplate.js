import {empty, stitchArrays} from '#sugar';
import {filterMultipleArrays, sortChronologically} from '#wiki-data';

export default {
  contentDependencies: [
    'generateListingPage',
    'generateListAllAdditionalFilesChunk',
    'linkAlbum',
    'linkTrack',
    'linkAlbumAdditionalFile',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({albumData}) => ({albumData}),

  query(sprawl, spec, property) {
    const albums =
      sortChronologically(sprawl.albumData.slice());

    const tracks =
      albums
        .map(album => album.tracks.slice());

    // Get additional file objects from albums and their tracks.
    // There's a possibility that albums and tracks don't both implement
    // the same additional file fields - in this case, just treat them
    // as though they do implement those fields, but don't have any
    // additional files of that type.

    const albumAdditionalFileObjects =
      albums
        .map(album => album[property] ?? []);

    const trackAdditionalFileObjects =
      tracks
        .map(byAlbum => byAlbum
          .map(track => track[property] ?? []));

    // Filter out tracks that don't have any additional files.

    stitchArrays({tracks, trackAdditionalFileObjects})
      .forEach(({tracks, trackAdditionalFileObjects}) => {
        filterMultipleArrays(tracks, trackAdditionalFileObjects,
          (track, trackAdditionalFileObjects) => !empty(trackAdditionalFileObjects));
      });

    // Filter out albums that don't have any tracks,
    // nor any additional files of their own.

    filterMultipleArrays(albums, albumAdditionalFileObjects, tracks, trackAdditionalFileObjects,
      (album, albumAdditionalFileObjects, tracks, trackAdditionalFileObjects) =>
        !empty(albumAdditionalFileObjects) ||
        !empty(trackAdditionalFileObjects));

    // Map additional file objects into titles and lists of file names.

    const albumAdditionalFileTitles =
      albumAdditionalFileObjects
        .map(byAlbum => byAlbum
          .map(({title}) => title));

    const albumAdditionalFileFiles =
      albumAdditionalFileObjects
        .map(byAlbum => byAlbum
          .map(({files}) => files));

    const trackAdditionalFileTitles =
      trackAdditionalFileObjects
        .map(byAlbum => byAlbum
          .map(byTrack => byTrack
            .map(({title}) => title)));

    const trackAdditionalFileFiles =
      trackAdditionalFileObjects
        .map(byAlbum => byAlbum
          .map(byTrack => byTrack
            .map(({files}) => files)));

    return {
      spec,
      albums,
      tracks,
      albumAdditionalFileTitles,
      albumAdditionalFileFiles,
      trackAdditionalFileTitles,
      trackAdditionalFileFiles,
    };
  },

  relations: (relation, query) => ({
    page:
      relation('generateListingPage', query.spec),

    albumLinks:
      query.albums
        .map(album => relation('linkAlbum', album)),

    trackLinks:
      query.tracks
        .map(byAlbum => byAlbum
          .map(track => relation('linkTrack', track))),

    albumChunks:
      query.albums
        .map(() => relation('generateListAllAdditionalFilesChunk')),

    trackChunks:
      query.tracks
        .map(byAlbum => byAlbum
          .map(() => relation('generateListAllAdditionalFilesChunk'))),

    albumAdditionalFileLinks:
      stitchArrays({
        album: query.albums,
        files: query.albumAdditionalFileFiles,
      }).map(({album, files: byAlbum}) =>
          byAlbum.map(files => files
            .map(file =>
              relation('linkAlbumAdditionalFile', album, file)))),

    trackAdditionalFileLinks:
      stitchArrays({
        album: query.albums,
        files: query.trackAdditionalFileFiles,
      }).map(({album, files: byAlbum}) =>
          byAlbum
            .map(byTrack => byTrack
              .map(files => files
                .map(file => relation('linkAlbumAdditionalFile', album, file))))),
  }),

  data: (query) => ({
    albumAdditionalFileTitles: query.albumAdditionalFileTitles,
    trackAdditionalFileTitles: query.trackAdditionalFileTitles,
    albumAdditionalFileFiles: query.albumAdditionalFileFiles,
    trackAdditionalFileFiles: query.trackAdditionalFileFiles,
  }),

  slots: {
    stringsKey: {type: 'string'},
  },

  generate: (data, relations, slots, {html, language}) =>
    relations.page.slots({
      type: 'custom',

      content:
        stitchArrays({
          albumLink: relations.albumLinks,
          trackLinks: relations.trackLinks,
          albumChunk: relations.albumChunks,
          trackChunks: relations.trackChunks,
          albumAdditionalFileTitles: data.albumAdditionalFileTitles,
          trackAdditionalFileTitles: data.trackAdditionalFileTitles,
          albumAdditionalFileLinks: relations.albumAdditionalFileLinks,
          trackAdditionalFileLinks: relations.trackAdditionalFileLinks,
          albumAdditionalFileFiles: data.albumAdditionalFileFiles,
          trackAdditionalFileFiles: data.trackAdditionalFileFiles,
        }).map(({
            albumLink,
            trackLinks,
            albumChunk,
            trackChunks,
            albumAdditionalFileTitles,
            trackAdditionalFileTitles,
            albumAdditionalFileLinks,
            trackAdditionalFileLinks,
            albumAdditionalFileFiles,
            trackAdditionalFileFiles,
          }) => [
            html.tag('h3', {class: 'content-heading'}, albumLink),

            html.tag('dl', [
              albumChunk.slots({
                title: language.$(`listingPage.${slots.stringsKey}.albumFiles`),
                additionalFileTitles: albumAdditionalFileTitles,
                additionalFileLinks: albumAdditionalFileLinks,
                additionalFileFiles: albumAdditionalFileFiles,
                stringsKey: slots.stringsKey,
              }),

              stitchArrays({
                trackLink: trackLinks,
                trackChunk: trackChunks,
                trackAdditionalFileTitles,
                trackAdditionalFileLinks,
                trackAdditionalFileFiles,
              }).map(({
                  trackLink,
                  trackChunk,
                  trackAdditionalFileTitles,
                  trackAdditionalFileLinks,
                  trackAdditionalFileFiles,
                }) =>
                  trackChunk.slots({
                    title: trackLink,
                    additionalFileTitles: trackAdditionalFileTitles,
                    additionalFileLinks: trackAdditionalFileLinks,
                    additionalFileFiles: trackAdditionalFileFiles,
                    stringsKey: slots.stringsKey,
                  })),
            ]),
          ]),
    }),
};
