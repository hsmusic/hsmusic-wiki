import {sortAlbumsTracksChronologically, sortEntryThingPairs} from '#sort';
import {chunkByProperties, stitchArrays} from '#sugar';

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

    const processEntry = ({thing, type, track, album, contribs}) => ({
      thing: thing,
      entry: {
        type: type,
        track: track,
        album: album,
        contribs: contribs,
        date: thing.coverArtDate ?? thing.date,
      },
    });

    const processAlbumEntry = ({type, album, contribs}) =>
      processEntry({
        thing: album,
        type: type,
        track: null,
        album: album,
        contribs: contribs,
      });

    const processTrackEntry = ({type, track, contribs}) =>
      processEntry({
        thing: track,
        type: type,
        track: track,
        album: track.album,
        contribs: contribs,
      });

    const processAlbumEntries = ({type, albums, contribs}) =>
      stitchArrays({
        album: albums,
        contribs: contribs,
      }).map(entry =>
          processAlbumEntry({type, ...entry}));

    const processTrackEntries = ({type, tracks, contribs}) =>
      stitchArrays({
        track: tracks,
        contribs: contribs,
      }).map(entry =>
          processTrackEntry({type, ...entry}));

    const {
      albumsAsCoverArtist,
      albumsAsWallpaperArtist,
      albumsAsBannerArtist,
      tracksAsCoverArtist,
    } = artist;

    const albumsAsCoverArtistContribs =
      albumsAsCoverArtist
        .map(album => album.coverArtistContribs);

    const albumsAsWallpaperArtistContribs =
      albumsAsWallpaperArtist
        .map(album => album.wallpaperArtistContribs);

    const albumsAsBannerArtistContribs =
      albumsAsBannerArtist
        .map(album => album.bannerArtistContribs);

    const tracksAsCoverArtistContribs =
      tracksAsCoverArtist
        .map(track => track.coverArtistContribs);

    const albumsAsCoverArtistEntries =
      processAlbumEntries({
        type: 'albumCover',
        albums: albumsAsCoverArtist,
        contribs: albumsAsCoverArtistContribs,
      });

    const albumsAsWallpaperArtistEntries =
      processAlbumEntries({
        type: 'albumWallpaper',
        albums: albumsAsWallpaperArtist,
        contribs: albumsAsWallpaperArtistContribs,
      });

    const albumsAsBannerArtistEntries =
      processAlbumEntries({
        type: 'albumBanner',
        albums: albumsAsBannerArtist,
        contribs: albumsAsBannerArtistContribs,
      });

    const tracksAsCoverArtistEntries =
      processTrackEntries({
        type: 'trackCover',
        tracks: tracksAsCoverArtist,
        contribs: tracksAsCoverArtistContribs,
      });

    const entries = [
      ...albumsAsCoverArtistEntries,
      ...albumsAsWallpaperArtistEntries,
      ...albumsAsBannerArtistEntries,
      ...tracksAsCoverArtistEntries,
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
          chunk.map(({contribs}) => relation('generateArtistInfoPageOtherArtistLinks', contribs))),
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
              .find(contrib => contrib.artist === artist)
              .annotation)),
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
                      annotation: contribution,

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
