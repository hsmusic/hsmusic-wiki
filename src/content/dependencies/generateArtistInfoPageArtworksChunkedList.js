import {stitchArrays} from '#sugar';

import {
  chunkByProperties,
  sortAlbumsTracksChronologically,
  sortEntryThingPairs,
} from '#wiki-data';

export default {
  contentDependencies: [
    'generateArtistInfoPageChunk',
    'generateArtistInfoPageChunkedList',
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
      ...artist.albumsAsCoverArtist.map(album => ({
        thing: album,
        entry: {
          type: 'albumCover',
          album: album,
          date: album.coverArtDate ?? album.date,
          contribs: album.coverArtistContribs,
        },
      })),

      ...artist.albumsAsWallpaperArtist.map(album => ({
        thing: album,
        entry: {
          type: 'albumWallpaper',
          album: album,
          date: album.coverArtDate ?? album.date,
          contribs: album.wallpaperArtistContribs,
        },
      })),

      ...artist.albumsAsBannerArtist.map(album => ({
        thing: album,
        entry: {
          type: 'albumBanner',
          album: album,
          date: album.coverArtDate ?? album.date,
          contribs: album.bannerArtistContribs,
        },
      })),

      ...artist.tracksAsCoverArtist.map(track => ({
        thing: track,
        entry: {
          type: 'trackCover',
          album: track.album,
          date: track.coverArtDate ?? track.date,
          track: track,
          contribs: track.coverArtistContribs,
        },
      })),
    ];

    sortEntryThingPairs(entries,
      things => sortAlbumsTracksChronologically(things, {
        getDate: thing => thing.coverArtDate ?? thing.date,
      }));

    const chunks =
      chunkByProperties(
        entries.map(({entry}) => entry),
        ['album', 'date']);

    return {chunks};
  },

  relations(relation, query, artist) {
    return {
      chunkedList:
        relation('generateArtistInfoPageChunkedList'),

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

      itemOtherArtistLinks:
        query.chunks.map(({chunk}) =>
          chunk.map(({contribs}) => relation('generateArtistInfoPageOtherArtistLinks', contribs, artist))),
    };
  },

  data(query, artist) {
    return {
      chunkDates:
        query.chunks.map(({date}) => date),

      itemTypes:
        query.chunks.map(({chunk}) =>
          chunk.map(({type}) => type)),

      itemContributions:
        query.chunks.map(({chunk}) =>
          chunk.map(({contribs}) =>
            contribs
              .find(({who}) => who === artist)
              .what)),
    };
  },

  generate(data, relations, {html, language}) {
    return relations.chunkedList.slots({
      chunks:
        stitchArrays({
          chunk: relations.chunks,
          albumLink: relations.albumLinks,
          date: data.chunkDates,

          items: relations.items,
          itemTrackLinks: relations.itemTrackLinks,
          itemOtherArtistLinks: relations.itemOtherArtistLinks,
          itemTypes: data.itemTypes,
          itemContributions: data.itemContributions,
        }).map(({
            chunk,
            albumLink,
            date,

            items,
            itemTrackLinks,
            itemOtherArtistLinks,
            itemTypes,
            itemContributions,
          }) =>
            chunk.slots({
              mode: 'album',
              albumLink,
              date,

              items:
                stitchArrays({
                  item: items,
                  trackLink: itemTrackLinks,
                  otherArtistLinks: itemOtherArtistLinks,
                  type: itemTypes,
                  contribution: itemContributions,
                }).map(({
                    item,
                    trackLink,
                    otherArtistLinks,
                    type,
                    contribution,
                  }) =>
                    item.slots({
                      otherArtistLinks,
                      contribution,

                      content:
                        (type === 'trackCover'
                          ? language.$('artistPage.creditList.entry.track', {
                              track: trackLink,
                            })
                          : html.tag('i',
                              language.$('artistPage.creditList.entry.album.' + {
                                albumWallpaper: 'wallpaperArt',
                                albumBanner: 'bannerArt',
                                albumCover: 'coverArt',
                              }[type]))),
                    })),
            })),
    });
  },
};
