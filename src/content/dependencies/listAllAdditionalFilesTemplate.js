import {sortChronologically} from '#sort';
import {empty, filterMultipleArrays, stitchArrays} from '#sugar';

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

    const albumAdditionalFileFilenames =
      albumAdditionalFileObjects
        .map(byAlbum => byAlbum
          .map(({filenames}) => filenames));

    const trackAdditionalFileTitles =
      trackAdditionalFileObjects
        .map(byAlbum => byAlbum
          .map(byTrack => byTrack
            .map(({title}) => title)));

    const trackAdditionalFileFilenames =
      trackAdditionalFileObjects
        .map(byAlbum => byAlbum
          .map(byTrack => byTrack
            .map(({filenames}) => filenames)));

    return {
      spec,
      albums,
      tracks,
      albumAdditionalFileTitles,
      albumAdditionalFileFilenames,
      trackAdditionalFileTitles,
      trackAdditionalFileFilenames,
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
        filenames: query.albumAdditionalFileFilenames,
      }).map(({album, filenames: byAlbum}) =>
          byAlbum
            .map(filenames => filenames
              .map(filename => relation('linkAlbumAdditionalFile', album, filename)))),

    trackAdditionalFileLinks:
      stitchArrays({
        album: query.albums,
        filenames: query.trackAdditionalFileFilenames,
      }).map(({album, filenames: byAlbum}) =>
          byAlbum
            .map(byTrack => byTrack
              .map(filenames => filenames
                .map(filename => relation('linkAlbumAdditionalFile', album, filename))))),
  }),

  data: (query) => ({
    albumAdditionalFileTitles: query.albumAdditionalFileTitles,
    trackAdditionalFileTitles: query.trackAdditionalFileTitles,
    albumAdditionalFileFilenames: query.albumAdditionalFileFilenames,
    trackAdditionalFileFilenames: query.trackAdditionalFileFilenames,
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
          albumAdditionalFileFilenames: data.albumAdditionalFileFilenames,
          trackAdditionalFileFilenames: data.trackAdditionalFileFilenames,
        }).map(({
            albumLink,
            trackLinks,
            albumChunk,
            trackChunks,
            albumAdditionalFileTitles,
            trackAdditionalFileTitles,
            albumAdditionalFileLinks,
            trackAdditionalFileLinks,
            albumAdditionalFileFilenames,
            trackAdditionalFileFilenames,
          }) => [
            html.tag('h3', {class: 'content-heading'}, albumLink),

            html.tag('dl', [
              albumChunk.slots({
                title:
                  language.$('listingPage', slots.stringsKey, 'albumFiles'),

                additionalFileTitles: albumAdditionalFileTitles,
                additionalFileLinks: albumAdditionalFileLinks,
                additionalFileFilenames: albumAdditionalFileFilenames,

                stringsKey: slots.stringsKey,
              }),

              stitchArrays({
                trackLink: trackLinks,
                trackChunk: trackChunks,
                trackAdditionalFileTitles,
                trackAdditionalFileLinks,
                trackAdditionalFileFilenames,
              }).map(({
                  trackLink,
                  trackChunk,
                  trackAdditionalFileTitles,
                  trackAdditionalFileLinks,
                  trackAdditionalFileFilenames,
                }) =>
                  trackChunk.slots({
                    title: trackLink,
                    additionalFileTitles: trackAdditionalFileTitles,
                    additionalFileLinks: trackAdditionalFileLinks,
                    additionalFileFilenames: trackAdditionalFileFilenames,
                    stringsKey: slots.stringsKey,
                  })),
            ]),
          ]),
    }),
};
