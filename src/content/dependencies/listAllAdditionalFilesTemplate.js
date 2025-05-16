import {sortChronologically} from '#sort';
import {empty, filterMultipleArrays, stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateListingPage',
    'generateListAllAdditionalFilesChunk',
    'linkAlbum',
    'linkTrack',
    'linkAdditionalFile',
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

    const albumAdditionalFileLists =
      albums
        .map(album => album[property] ?? []);

    const trackAdditionalFileLists =
      tracks
        .map(byAlbum => byAlbum
          .map(track => track[property] ?? []));

    // Filter out tracks that don't have any additional files.

    stitchArrays({tracks, trackAdditionalFileLists})
      .forEach(({tracks, trackAdditionalFileLists}) => {
        filterMultipleArrays(tracks, trackAdditionalFileLists,
          (track, trackAdditionalFileLists) => !empty(trackAdditionalFileLists));
      });

    // Filter out albums that don't have any tracks,
    // nor any additional files of their own.

    filterMultipleArrays(albums, albumAdditionalFileLists, tracks, trackAdditionalFileLists,
      (album, albumAdditionalFileLists, tracks, trackAdditionalFileLists) =>
        !empty(albumAdditionalFileLists) ||
        !empty(trackAdditionalFileLists));

    return {
      spec,
      albums,
      tracks,
      albumAdditionalFileLists,
      trackAdditionalFileLists,
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
      query.albumAdditionalFileLists
        .map(files => files
          .map(file => file.filenames
            .map(filename => relation('linkAdditionalFile', file, filename)))),

    trackAdditionalFileLinks:
      query.trackAdditionalFileLists
        .map(byAlbum => byAlbum
          .map(files => files
            .map(file => file.filenames
              .map(filename => relation('linkAdditionalFile', file, filename))))),
  }),

  data: (query) => ({
    albumAdditionalFileTitles:
      query.albumAdditionalFileLists
        .map(files => files
          .map(file => file.title)),

    trackAdditionalFileTitles:
      query.trackAdditionalFileLists
        .map(byAlbum => byAlbum
          .map(files => files
            .map(file => file.title))),

    albumAdditionalFileFilenames:
      query.albumAdditionalFileLists
        .map(files => files
          .map(file => file.filenames)),

    trackAdditionalFileFilenames:
      query.trackAdditionalFileLists
        .map(byAlbum => byAlbum
          .map(files => files
            .map(file => file.filenames))),
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
