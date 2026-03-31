import {chunkByProperties, stitchArrays} from '#sugar';

import {
  sortAlbumsTracksChronologically,
  sortByDate,
  sortEntryThingPairs,
} from '#sort';

export default {
  query(artist, filterWikiEditorCommentary) {
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

        quoted:
         !entry.headingArtists.includes(artist) &&
          entry.quotedArtists.includes(artist),

        annotation: entry.annotation,
        annotationParts: entry.annotationParts,
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

            .filter(entry =>
              (filterWikiEditorCommentary
                ? entry.isWikiEditorCommentary
                : !entry.isWikiEditorCommentary))

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

  relations: (relation, query, _artist, filterWikiEditorCommentary) => ({
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
          .map(entry =>
            relation('transformContent',
              (filterWikiEditorCommentary
                ? entry.annotationParts
                    .filter(part => part !== 'wiki editor')
                    .join(', ')
                : entry.annotation)))),
  }),

  data: (query, _artist, _filterWikiEditorCommentary) => ({
    chunkTypes:
      query.chunks
        .map(({chunkType}) => chunkType),

    itemTypes:
      query.chunks
        .map(({chunk}) => chunk
          .map(({itemType}) => itemType)),

    itemQuoted:
      query.chunks
        .map(({chunk}) => chunk
          .map(({quoted}) => quoted)),
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
        itemQuoted: data.itemQuoted,
      }).map(({
          chunk,
          chunkLink,
          chunkType,

          items,
          itemLinks,
          itemAnnotations,
          itemTypes,
          itemQuoted,
        }) =>
          language.encapsulate('artistPage.creditList.entry', capsule => {
            // The citation slot, instead of annotation, gives commentary
            // a specially custom look.
            const citations =
              stitchArrays({annotation: itemAnnotations, quoted: itemQuoted})
                .map(({annotation, quoted}) =>
                  language.encapsulate(capsule, workingCapsule => {
                    const workingOptions = {};

                    let any = false;

                    annotation.setSlots({
                      mode: 'inline',
                      absorbPunctuationFollowingExternalLinks: false,
                    });

                    if (!html.isBlank(annotation)) {
                      workingCapsule += '.citation';
                      workingOptions.citation = annotation;
                      any = true;
                    }

                    if (quoted) {
                      workingCapsule += '.quoted';
                      any = true;
                    }

                    if (any) {
                      return language.$(workingCapsule, workingOptions);
                    } else {
                      return html.blank();
                    }
                  }));

            let contents;

            if (chunkType === 'album') {
              chunk.setSlot('mode', 'album');
              contents =
                stitchArrays({link: itemLinks, type: itemTypes})
                  .map(({link, type}) =>
                    (type === 'album'
                      ? html.tag('i',
                          language.$(capsule, 'album.commentary'))
                      : language.$(capsule, 'track', {track: link})));

            } else if (chunkType === 'flash-act') {
              chunk.setSlot('mode', 'flash');
              contents =
                itemLinks.map(link =>
                  language.$(capsule, 'flash', {flash: link}));

            } else {
              throw new Error(`Gyeep!!`);
            }

            chunk.setSlots({
              link: chunkLink,

              list:
                html.tag('ul',
                  stitchArrays({
                    item: items,
                    citation: citations,
                    content: contents,
                  }).map(({item, citation, content}) =>
                      item.slots({citation, content}))),
            });

            return chunk;
          }))),
};
