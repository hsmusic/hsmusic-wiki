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
    // TODO: Add and integrate wallpaper and banner date fields (#90)
    // This will probably only happen once all artworks follow a standard
    // shape (#70) and get their own sorting function. Read for more info:
    // https://github.com/hsmusic/hsmusic-wiki/issues/90#issuecomment-1607422961

    const entries = [
      ...artist.albumsAsCommentator.map(album => ({
        thing: album,
        entry: {
          type: 'album',
          album,
        },
      })),

      ...artist.tracksAsCommentator.map(track => ({
        thing: track,
        entry: {
          type: 'track',
          album: track.album,
          track,
        },
      })),
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
