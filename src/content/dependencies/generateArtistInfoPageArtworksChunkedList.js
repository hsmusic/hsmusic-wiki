import {stitchArrays} from '../../util/sugar.js';

import {
  chunkByProperties,
  sortAlbumsTracksChronologically,
  sortEntryThingPairs,
} from '../../util/wiki-data.js';

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
      ...artist.albumsAsCoverArtist.map(album => ({
        thing: album,
        entry: {
          type: 'albumCover',
          album: album,
          date: album.coverArtDate,
          contribs: album.coverArtistContribs,
        },
        // ...getContributionDescription(album.coverArtistContribs),
        // ...getOtherArtistLinks(album.coverArtistContribs),
      })),

      ...artist.albumsAsWallpaperArtist.map(album => ({
        thing: album,
        entry: {
          type: 'albumWallpaper',
          album: album,
          date: album.coverArtDate,
          contribs: album.wallpaperArtistContribs,
        },
        // ...getContributionDescription(album.wallpaperArtistContribs),
        // ...getOtherArtistLinks(album.wallpaperArtistContribs),
      })),

      ...artist.albumsAsBannerArtist.map(album => ({
        thing: album,
        entry: {
          type: 'albumBanner',
          album: album,
          date: album.coverArtDate,
          contribs: album.bannerArtistContribs,
        },
        // ...getContributionDescription(album.bannerArtistContribs),
        // ...getOtherArtistLinks(album.bannerArtistContribs),
      })),

      ...artist.tracksAsCoverArtist.map(track => ({
        thing: track,
        entry: {
          type: 'trackCover',
          album: track.album,
          date: track.coverArtDate,
          track: track,
          contribs: track.coverArtistContribs,
        },
        // rerelease: track.originalReleaseTrack !== null,
        // trackLink: relation('linkTrack', track),
        // ...getContributionDescription(track.coverArtistContribs),
        // ...getOtherArtistLinks(track.coverArtistContribs),
      })),
    ];

    sortEntryThingPairs(entries,
      things => sortAlbumsTracksChronologically(things, {
        getDate: thing => thing.coverArtDate,
      }));

    const chunks =
      chunkByProperties(
        entries.map(({entry}) => entry),
        ['album', 'date']);

    return {chunks};
  },

  relations(relation, query, artist) {
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

      itemTrackRereleases:
        query.chunks.map(({chunk}) =>
          chunk.map(({track}) => track ? !!track.originalReleaseTrack : null)),

      itemContributions:
        query.chunks.map(({chunk}) =>
          chunk.map(({contribs}) =>
            contribs
              .find(({who}) => who === artist)
              .what)),
    };
  },

  generate(data, relations, {html, language}) {
    return html.tag('dl',
      stitchArrays({
        chunk: relations.chunks,
        albumLink: relations.albumLinks,
        date: data.chunkDates,

        items: relations.items,
        itemTrackLinks: relations.itemTrackLinks,
        itemOtherArtistLinks: relations.itemOtherArtistLinks,
        itemTypes: data.itemTypes,
        itemTrackRereleases: data.itemTrackRereleases,
        itemContributions: data.itemContributions,
      }).map(({
          chunk,
          albumLink,
          date,

          items,
          itemTrackLinks,
          itemOtherArtistLinks,
          itemTypes,
          itemTrackRereleases,
          itemContributions,
        }) =>
          chunk.slots({
            albumLink,
            date,

            items:
              stitchArrays({
                item: items,
                trackLink: itemTrackLinks,
                otherArtistLinks: itemOtherArtistLinks,
                type: itemTypes,
                contribution: itemContributions,
                rerelease: itemTrackRereleases,
              }).map(({
                  item,
                  trackLink,
                  otherArtistLinks,
                  type,
                  contribution,
                  rerelease,
                }) =>
                  item.slots({
                    otherArtistLinks,
                    contribution,
                    rerelease,

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
          })));
  },
};
