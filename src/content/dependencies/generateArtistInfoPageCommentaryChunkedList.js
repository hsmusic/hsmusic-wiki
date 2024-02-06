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
    const processEntries = (things, details) =>
      things.flatMap(thing =>
        thing.commentary
          .filter(entry => entry.artists.includes(artist))
          .map(entry => ({
            thing,
            entry: {
              annotation: entry.annotation,
              ...details(thing, entry),
            },
          })));

    const albumEntries =
      processEntries(
        artist.albumsAsCommentator,
        album => ({
          type: 'album',
          album,
        }));

    const trackEntries =
      processEntries(
        artist.tracksAsCommentator,
        track => ({
          type: 'track',
          album: track.album,
          track,
        }));

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
