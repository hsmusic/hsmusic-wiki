import {chunkByProperties, stitchArrays} from '#sugar';

import {
  sortAlbumsTracksChronologically,
  sortByDate,
  sortEntryThingPairs,
} from '#sort';

export default {
  contentDependencies: [
    'generateArtistInfoPageChunk',
    'generateArtistInfoPageChunkItem',
    'linkAlbum',
    'linkFlash',
    'linkFlashAct',
    'linkTrack',
    'transformContent',
  ],

  extraDependencies: ['html', 'language'],

  query(artist) {
    const processEntry = ({
      thing,
      entry,

      chunkType,
      itemType,

      album = null,
      track = null,
      flashAct = null,
      flash = null,
    }) => ({
      thing: thing,
      entry: {
        chunkType,
        itemType,

        album,
        track,
        flashAct,
        flash,

        annotation: entry.annotation,
      },
    });

    const processAlbumEntry = ({thing: album, entry}) =>
      processEntry({
        thing: album,
        entry: entry,

        chunkType: 'album',
        itemType: 'album',

        album: album,
        track: null,
      });

    const processTrackEntry = ({thing: track, entry}) =>
      processEntry({
        thing: track,
        entry: entry,

        chunkType: 'album',
        itemType: 'track',

        album: track.album,
        track: track,
      });

    const processFlashEntry = ({thing: flash, entry}) =>
      processEntry({
        thing: flash,
        entry: entry,

        chunkType: 'flash-act',
        itemType: 'flash',

        flashAct: flash.act,
        flash: flash,
      });

    const processEntries = ({things, processEntry}) =>
      things
        .flatMap(thing =>
          thing.commentary
            .filter(entry => entry.artists.includes(artist))
            .map(entry => processEntry({thing, entry})));

    const processAlbumEntries = ({albums}) =>
      processEntries({
        things: albums,
        processEntry: processAlbumEntry,
      });

    const processTrackEntries = ({tracks}) =>
      processEntries({
        things: tracks,
        processEntry: processTrackEntry,
      });

    const processFlashEntries = ({flashes}) =>
      processEntries({
        things: flashes,
        processEntry: processFlashEntry,
      });

    const {
      albumsAsCommentator,
      tracksAsCommentator,
      flashesAsCommentator,
    } = artist;

    const albumEntries =
      processAlbumEntries({
        albums: albumsAsCommentator,
      });

    const trackEntries =
      processTrackEntries({
        tracks: tracksAsCommentator,
      });

    const flashEntries =
      processFlashEntries({
        flashes: flashesAsCommentator,
      })

    const albumTrackEntries =
      sortEntryThingPairs(
        [...albumEntries, ...trackEntries],
        sortAlbumsTracksChronologically);

    const allEntries =
      sortEntryThingPairs(
        [...albumTrackEntries, ...flashEntries],
        sortByDate);

    const chunks =
      chunkByProperties(
        allEntries.map(({entry}) => entry),
        ['chunkType', 'album', 'flashAct']);

    return {chunks};
  },

  relations: (relation, query) => ({
    chunks:
      query.chunks
        .map(() => relation('generateArtistInfoPageChunk')),

    chunkLinks:
      query.chunks
        .map(({chunkType, album, flashAct}) =>
          (chunkType === 'album'
            ? relation('linkAlbum', album)
         : chunkType === 'flash-act'
            ? relation('linkFlashAct', flashAct)
            : null)),

    items:
      query.chunks
        .map(({chunk}) => chunk
          .map(() => relation('generateArtistInfoPageChunkItem'))),

    itemLinks:
      query.chunks
        .map(({chunk}) => chunk
          .map(({track, flash}) =>
            (track
              ? relation('linkTrack', track)
           : flash
              ? relation('linkFlash', flash)
              : null))),

    itemAnnotations:
      query.chunks
        .map(({chunk}) => chunk
          .map(({annotation}) =>
            (annotation
              ? relation('transformContent', annotation)
              : null))),
  }),

  data: (query) => ({
    chunkTypes:
      query.chunks
        .map(({chunkType}) => chunkType),

    itemTypes:
      query.chunks
        .map(({chunk}) => chunk
          .map(({itemType}) => itemType)),
  }),

  generate: (data, relations, {html, language}) =>
    html.tag('dl',
      {[html.onlyIfContent]: true},

      stitchArrays({
        chunk: relations.chunks,
        chunkLink: relations.chunkLinks,
        chunkType: data.chunkTypes,

        items: relations.items,
        itemLinks: relations.itemLinks,
        itemAnnotations: relations.itemAnnotations,
        itemTypes: data.itemTypes,
      }).map(({
          chunk,
          chunkLink,
          chunkType,

          items,
          itemLinks,
          itemAnnotations,
          itemTypes,
        }) =>
          language.encapsulate('artistPage.creditList.entry', capsule =>
            (chunkType === 'album'
              ? chunk.slots({
                  mode: 'album',
                  albumLink: chunkLink,
                  items:
                    stitchArrays({
                      item: items,
                      link: itemLinks,
                      annotation: itemAnnotations,
                      type: itemTypes,
                    }).map(({item, link, annotation, type}) =>
                      item.slots({
                        annotation:
                          (annotation
                            ? annotation.slots({
                                mode: 'inline',
                                absorbPunctuationFollowingExternalLinks: false,
                              })
                            : null),

                        content:
                          (type === 'album'
                            ? html.tag('i',
                                language.$(capsule, 'album.commentary'))
                            : language.$(capsule, 'track', {track: link})),
                      })),
                })
           : chunkType === 'flash-act'
              ? chunk.slots({
                  mode: 'flash',
                  flashActLink: chunkLink,
                  items:
                    stitchArrays({
                      item: items,
                      link: itemLinks,
                      annotation: itemAnnotations,
                    }).map(({item, link, annotation}) =>
                      item.slots({
                        annotation:
                          (annotation
                            ? annotation.slot('mode', 'inline')
                            : null),

                        content:
                          language.$(capsule, 'flash', {
                            flash: link,
                          }),
                      })),
                })
              : null)))),
};
