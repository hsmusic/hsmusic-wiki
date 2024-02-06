import {stitchArrays} from '#sugar';

import {
  chunkByProperties,
  sortAlbumsTracksChronologically,
  sortEntryThingPairs,
} from '#wiki-data';

export default {
  contentDependencies: [
    'generateArtistInfoPageChunk',
    'generateArtistInfoPageChunkItem',
    'generateArtistInfoPageOtherArtistLinks',
    'linkAlbum',
    'linkTrack',
    'transformContent',
  ],

  extraDependencies: ['html', 'language'],

  query(artist) {
    const processEntry = ({thing, entry, type, track, album}) => ({
      thing: thing,
      entry: {
        type: type,
        track: track,
        album: album,
        annotation: entry.annotation,
      },
    });

    const processAlbumEntry = ({type, album, entry}) =>
      processEntry({
        thing: album,
        entry: entry,
        type: type,
        album: album,
        track: null,
      });

    const processTrackEntry = ({type, track, entry}) =>
      processEntry({
        thing: track,
        entry: entry,
        type: type,
        album: track.album,
        track: track,
      });

    const processEntries = ({things, processEntry}) =>
      things
        .flatMap(thing =>
          thing.commentary
            .filter(entry => entry.artists.includes(artist))
            .map(entry => processEntry({thing, entry})));

    const processAlbumEntries = ({type, albums}) =>
      processEntries({
        things: albums,
        processEntry: ({thing, entry}) =>
          processAlbumEntry({
            type: type,
            album: thing,
            entry: entry,
          }),
      });

    const processTrackEntries = ({type, tracks}) =>
      processEntries({
        things: tracks,
        processEntry: ({thing, entry}) =>
          processTrackEntry({
            type: type,
            track: thing,
            entry: entry,
          }),
      });

    const {albumsAsCommentator, tracksAsCommentator} = artist;

    const trackEntries =
      processTrackEntries({
        type: 'track',
        tracks: tracksAsCommentator,
      });

    const albumEntries =
      processAlbumEntries({
        type: 'album',
        albums: albumsAsCommentator,
      });

    const entries = [
      ...albumEntries,
      ...trackEntries,
    ];

    sortEntryThingPairs(entries, sortAlbumsTracksChronologically);

    const chunks =
      chunkByProperties(
        entries.map(({entry}) => entry),
        ['album']);

    return {chunks};
  },

  relations(relation, query) {
    return {
      chunks:
        query.chunks.map(() => relation('generateArtistInfoPageChunk')),

      albumLinks:
        query.chunks.map(({album}) => relation('linkAlbum', album)),

      items:
        query.chunks.map(({chunk}) =>
          chunk.map(() => relation('generateArtistInfoPageChunkItem'))),

      itemTrackLinks:
        query.chunks.map(({chunk}) =>
          chunk.map(({track}) =>
            (track
              ? relation('linkTrack', track)
              : null))),

      itemAnnotations:
        query.chunks.map(({chunk}) =>
          chunk.map(({annotation}) =>
            (annotation
              ? relation('transformContent', annotation)
              : null))),
    };
  },

  data(query) {
    return {
      itemTypes:
        query.chunks.map(({chunk}) =>
          chunk.map(({type}) => type)),
    };
  },

  generate(data, relations, {html, language}) {
    return html.tag('dl',
      stitchArrays({
        chunk: relations.chunks,
        albumLink: relations.albumLinks,

        items: relations.items,
        itemTrackLinks: relations.itemTrackLinks,
        itemAnnotations: relations.itemAnnotations,
        itemTypes: data.itemTypes,
      }).map(({
          chunk,
          albumLink,

          items,
          itemTrackLinks,
          itemAnnotations,
          itemTypes,
        }) =>
          chunk.slots({
            mode: 'album',
            albumLink,
            items:
              stitchArrays({
                item: items,
                trackLink: itemTrackLinks,
                annotation: itemAnnotations,
                type: itemTypes,
              }).map(({item, trackLink, annotation, type}) =>
                item.slots({
                  annotation:
                    (annotation
                      ? annotation.slot('mode', 'inline')
                      : null),

                  content:
                    (type === 'album'
                      ? html.tag('i',
                          language.$('artistPage.creditList.entry.album.commentary'))
                      : language.$('artistPage.creditList.entry.track', {
                          track: trackLink,
                        })),
                })),
          })));
  },
};
