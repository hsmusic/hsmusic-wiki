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
  ],

  extraDependencies: ['html', 'language'],

  query(artist) {
    const processEntries = (things, details) =>
      things.map(thing => ({
        thing,
        entry: details(thing),
      }));

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
          chunk.map(({track}) => track ? relation('linkTrack', track) : null)),
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
        itemTypes: data.itemTypes,
      }).map(({chunk, albumLink, items, itemTrackLinks, itemTypes}) =>
          chunk.slots({
            mode: 'album',
            albumLink,
            items:
              stitchArrays({
                item: items,
                trackLink: itemTrackLinks,
                type: itemTypes,
              }).map(({item, trackLink, type}) =>
                item.slots({
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
