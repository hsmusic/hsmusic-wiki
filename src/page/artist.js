// Artist page specification.
//
// NB: See artist-alias.js for artist alias redirect pages.

import {
  bindOpts,
  empty,
  unique,
} from '../util/sugar.js';

import {
  chunkByProperties,
  getTotalDuration,
  sortAlbumsTracksChronologically,
  sortChronologically,
} from '../util/wiki-data.js';

export function targets({wikiData}) {
  return wikiData.artistData;
}

export function write(artist, {wikiData}) {
  const {groupData, wikiInfo} = wikiData;

  const {name, urls, contextNotes} = artist;

  const artThingsAll = sortAlbumsTracksChronologically(
    unique([
      ...(artist.albumsAsCoverArtist ?? []),
      ...(artist.albumsAsWallpaperArtist ?? []),
      ...(artist.albumsAsBannerArtist ?? []),
      ...(artist.tracksAsCoverArtist ?? []),
    ]),
    {getDate: (o) => o.coverArtDate});

  const artThingsGallery = sortAlbumsTracksChronologically(
    [
      ...(artist.albumsAsCoverArtist ?? []),
      ...(artist.tracksAsCoverArtist ?? []),
    ],
    {getDate: (o) => o.coverArtDate});

  const commentaryThings = sortAlbumsTracksChronologically([
    ...(artist.albumsAsCommentator ?? []),
    ...(artist.tracksAsCommentator ?? []),
  ]);

  const hasGallery = !empty(artThingsGallery);

  const getArtistsAndContrib = (thing, key) => ({
    artists: thing[key]?.filter(({who}) => who !== artist),
    contrib: thing[key]?.find(({who}) => who === artist),
    thing,
    key,
  });

  const artListChunks = chunkByProperties(
    artThingsAll.flatMap((thing) =>
      ['coverArtistContribs', 'wallpaperArtistContribs', 'bannerArtistContribs']
        .map((key) => getArtistsAndContrib(thing, key))
        .filter(({contrib}) => contrib)
        .map((props) => ({
          album: thing.album || thing,
          track: thing.album ? thing : null,
          date: thing.date,
          ...props,
        }))),
    ['date', 'album']);

  const commentaryListChunks = chunkByProperties(
    commentaryThings.map((thing) => ({
      album: thing.album || thing,
      track: thing.album ? thing : null,
    })),
    ['album']);

  const allTracks = sortAlbumsTracksChronologically(
    unique([
      ...(artist.tracksAsArtist ?? []),
      ...(artist.tracksAsContributor ?? []),
    ]));

  const chunkTracks = (tracks) =>
    chunkByProperties(
      tracks.map((track) => ({
        track,
        date: +track.date,
        album: track.album,
        duration: track.duration,
        artists: track.artistContribs.some(({who}) => who === artist)
          ? track.artistContribs.filter(({who}) => who !== artist)
          : track.contributorContribs.filter(({who}) => who !== artist),
        contrib: {
          who: artist,
          whatArray: [
            track.artistContribs.find(({who}) => who === artist)?.what,
            track.contributorContribs.find(({who}) => who === artist)?.what,
          ].filter(Boolean),
        },
      })),
      ['date', 'album'])
    .map(({date, album, chunk}) => ({
      date,
      album,
      chunk,
      duration: getTotalDuration(chunk),
    }));

  const trackListChunks = chunkTracks(allTracks);
  const totalDuration = getTotalDuration(allTracks);

  const countGroups = (things) => {
    const usedGroups = things.flatMap(
      (thing) => thing.groups || thing.album?.groups || []);
    return groupData
      .map((group) => ({
        group,
        contributions: usedGroups.filter(g => g === group).length,
      }))
      .filter(({contributions}) => contributions > 0)
      .sort((a, b) => b.contributions - a.contributions);
  };

  const musicGroups = countGroups(allTracks);
  const artGroups = countGroups(artThingsAll);

  let flashes, flashListChunks;
  if (wikiInfo.enableFlashesAndGames) {
    flashes = sortChronologically(artist.flashesAsContributor.slice());
    flashListChunks = chunkByProperties(
      flashes.map((flash) => ({
        act: flash.act,
        flash,
        date: flash.date,
        // Manual artists/contrib properties here, 8ecause we don't
        // want to show the full list of other contri8utors inline.
        // (It can often 8e very, very large!)
        artists: [],
        contrib: flash.contributorContribs.find(({who}) => who === artist),
      })),
      ['act']
    ).map(({act, chunk}) => ({
      act,
      chunk,
      dateFirst: chunk[0].date,
      dateLast: chunk[chunk.length - 1].date,
    }));
  }

  const generateEntryAccents = ({
    getArtistString,
    language,
    original,
    entry,
    artists,
    contrib,
  }) =>
    original
      ? language.$('artistPage.creditList.entry.rerelease', {entry})
      : !empty(artists)
      ? contrib.what || contrib.whatArray?.length
        ? language.$('artistPage.creditList.entry.withArtists.withContribution', {
            entry,
            artists: getArtistString(artists),
            contribution: contrib.whatArray
              ? language.formatUnitList(contrib.whatArray)
              : contrib.what,
          })
        : language.$('artistPage.creditList.entry.withArtists', {
            entry,
            artists: getArtistString(artists),
          })
      : contrib.what || contrib.whatArray?.length
      ? language.$('artistPage.creditList.entry.withContribution', {
          entry,
          contribution: contrib.whatArray
            ? language.formatUnitList(contrib.whatArray)
            : contrib.what,
        })
      : entry;

  const unbound_generateTrackList = (chunks, {
    getArtistString,
    html,
    language,
    link,
  }) =>
    html.tag('dl',
      chunks.flatMap(({date, album, chunk, duration}) => [
        html.tag('dt',
          date && duration ?
            language.$('artistPage.creditList.album.withDate.withDuration', {
              album: link.album(album),
              date: language.formatDate(date),
              duration: language.formatDuration(duration, {
                approximate: true,
              }),
            }) :

          date ?
            language.$('artistPage.creditList.album.withDate', {
              album: link.album(album),
              date: language.formatDate(date),
            }) :

          duration ?
            language.$('artistPage.creditList.album.withDuration', {
              album: link.album(album),
              duration: language.formatDuration(duration, {
                approximate: true,
              }),
            }) :

          language.$('artistPage.creditList.album', {
            album: link.album(album),
          })),

        html.tag('dd',
          html.tag('ul',
            chunk
              .map(({track, ...props}) => ({
                original: track.originalReleaseTrack,
                entry: language.$('artistPage.creditList.entry.track.withDuration', {
                  track: link.track(track),
                  duration: language.formatDuration(track.duration ?? 0),
                }),
                ...props,
              }))
              .map(({original, ...opts}) =>
                html.tag('li',
                  {class: original && 'rerelease'},
                  generateEntryAccents({
                    getArtistString,
                    language,
                    original,
                    ...opts,
                  })
                )
              ))),
      ]));

  const unbound_serializeArtistsAndContrib =
    (key, {serializeContribs, serializeLink}) =>
    (thing) => {
      const {artists, contrib} = getArtistsAndContrib(thing, key);
      const ret = {};
      ret.link = serializeLink(thing);
      if (contrib.what) ret.contribution = contrib.what;
      if (!empty(artists)) ret.otherArtists = serializeContribs(artists);
      return ret;
    };

  const unbound_serializeTrackListChunks = (chunks, {serializeLink}) =>
    chunks.map(({date, album, chunk, duration}) => ({
      album: serializeLink(album),
      date,
      duration,
      tracks: chunk.map(({track}) => ({
        link: serializeLink(track),
        duration: track.duration,
      })),
    }));

  const jumpTo = {
    tracks: !empty(allTracks),
    art: !empty(artThingsAll),
    flashes: wikiInfo.enableFlashesAndGames && !empty(flashes),
    commentary: !empty(commentaryThings),
  };

  const showJumpTo = Object.values(jumpTo).includes(true);

  const data = {
    type: 'data',
    path: ['artist', artist.directory],
    data: ({serializeContribs, serializeLink}) => {
      const serializeArtistsAndContrib = bindOpts(unbound_serializeArtistsAndContrib, {
        serializeContribs,
        serializeLink,
      });

      const serializeTrackListChunks = bindOpts(unbound_serializeTrackListChunks, {
        serializeLink,
      });

      return {
        albums: {
          asCoverArtist: artist.albumsAsCoverArtist
            .map(serializeArtistsAndContrib('coverArtistContribs')),
          asWallpaperArtist: artist.albumsAsWallpaperArtist
            .map(serializeArtistsAndContrib('wallpaperArtistContribs')),
          asBannerArtist: artist.albumsAsBannerArtis
            .map(serializeArtistsAndContrib('bannerArtistContribs')),
        },
        flashes: wikiInfo.enableFlashesAndGames
          ? {
              asContributor: artist.flashesAsContributor
                .map(flash => getArtistsAndContrib(flash, 'contributorContribs'))
                .map(({contrib, thing: flash}) => ({
                  link: serializeLink(flash),
                  contribution: contrib.what,
                })),
            }
          : null,
        tracks: {
          asArtist: artist.tracksAsArtist
            .map(serializeArtistsAndContrib('artistContribs')),
          asContributor: artist.tracksAsContributo
            .map(serializeArtistsAndContrib('contributorContribs')),
          chunked: serializeTrackListChunks(trackListChunks),
        },
      };
    },
  };

  const infoPage = {
    type: 'page',
    path: ['artist', artist.directory],
    page: ({
      fancifyURL,
      generateCoverLink,
      generateInfoGalleryLinks,
      getArtistAvatar,
      getArtistString,
      html,
      link,
      language,
      transformMultiline,
    }) => {
      const generateTrackList = bindOpts(unbound_generateTrackList, {
        getArtistString,
        html,
        language,
        link,
      });

      return {
        title: language.$('artistPage.title', {artist: name}),

        main: {
          content: [
            artist.hasAvatar &&
              generateCoverLink({
                src: getArtistAvatar(artist),
                alt: language.$('misc.alt.artistAvatar'),
              }),

            html.tag('h1',
              language.$('artistPage.title', {
                artist: name,
              })),

            ...html.fragment(
              contextNotes && [
                html.tag('p',
                  language.$('releaseInfo.note')),

                html.tag('blockquote',
                  transformMultiline(contextNotes)),

                html.tag('hr'),
              ]),

            !empty(urls) &&
              html.tag('p',
                language.$('releaseInfo.visitOn', {
                  links: language.formatDisjunctionList(
                    urls.map((url) => fancifyURL(url, {language}))
                  ),
                })),

            hasGallery &&
              html.tag('p',
                language.$('artistPage.viewArtGallery', {
                  link: link.artistGallery(artist, {
                    text: language.$('artistPage.viewArtGallery.link'),
                  }),
                })),

            showJumpTo &&
              html.tag('p',
                language.$('misc.jumpTo.withLinks', {
                  links: language.formatUnitList(
                    [
                      jumpTo.tracks &&
                        html.tag('a',
                          {href: '#tracks'},
                          language.$('artistPage.trackList.title')),

                      jumpTo.art &&
                        html.tag('a',
                          {href: '#art'},
                          language.$('artistPage.artList.title')),

                      jumpTo.flashes &&
                        html.tag('a',
                          {href: '#flashes'},
                          language.$('artistPage.flashList.title')),

                      jumpTo.commentary &&
                        html.tag('a',
                          {href: '#commentary'},
                          language.$('artistPage.commentaryList.title')),
                    ].filter(Boolean)),
                })),

            ...html.fragment(
              !empty(allTracks) && [
                html.tag('h2',
                  {id: 'tracks'},
                  language.$('artistPage.trackList.title')),

                totalDuration > 0 &&
                  html.tag('p',
                    language.$('artistPage.contributedDurationLine', {
                      artist: artist.name,
                      duration: language.formatDuration(
                        totalDuration,
                        {
                          approximate: true,
                          unit: true,
                        }
                      ),
                    })),

                !empty(musicGroups) &&
                  html.tag('p',
                    language.$('artistPage.musicGroupsLine', {
                      groups: language.formatUnitList(
                        musicGroups.map(({group, contributions}) =>
                          language.$('artistPage.groupsLine.item', {
                            group: link.groupInfo(group),
                            contributions:
                              language.countContributions(
                                contributions
                              ),
                          })
                        )
                      ),
                    })),

                generateTrackList(trackListChunks),
              ]),

            ...html.fragment(
              !empty(artThingsAll) && [
                html.tag('h2',
                  {id: 'art'},
                  language.$('artistPage.artList.title')),

                hasGallery &&
                  html.tag('p',
                    language.$('artistPage.viewArtGallery.orBrowseList', {
                      link: link.artistGallery(artist, {
                        text: language.$('artistPage.viewArtGallery.link'),
                      })
                    })),

                !empty(artGroups) &&
                  html.tag('p',
                    language.$('artistPage.artGroupsLine', {
                    groups: language.formatUnitList(
                      artGroups.map(({group, contributions}) =>
                        language.$('artistPage.groupsLine.item', {
                          group: link.groupInfo(group),
                          contributions:
                            language.countContributions(
                              contributions
                            ),
                        })
                      )
                    ),
                  })),

                html.tag('dl',
                  artListChunks.flatMap(({date, album, chunk}) => [
                    html.tag('dt', language.$('artistPage.creditList.album.withDate', {
                      album: link.album(album),
                      date: language.formatDate(date),
                    })),

                    html.tag('dd',
                      html.tag('ul',
                        chunk
                          .map(({track, key, ...props}) => ({
                            ...props,
                            entry:
                              track
                                ? language.$('artistPage.creditList.entry.track', {
                                    track: link.track(track),
                                  })
                                : html.tag('i',
                                    language.$('artistPage.creditList.entry.album.' + {
                                      wallpaperArtistContribs:
                                        'wallpaperArt',
                                      bannerArtistContribs:
                                        'bannerArt',
                                      coverArtistContribs:
                                        'coverArt',
                                    }[key])),
                          }))
                          .map((opts) => generateEntryAccents({
                            getArtistString,
                            language,
                            ...opts,
                          }))
                          .map(row => html.tag('li', row)))),
                  ])),
              ]),

            ...html.fragment(
              wikiInfo.enableFlashesAndGames &&
              !empty(flashes) && [
                html.tag('h2',
                  {id: 'flashes'},
                  language.$('artistPage.flashList.title')),

                html.tag('dl',
                  flashListChunks.flatMap(({
                    act,
                    chunk,
                    dateFirst,
                    dateLast,
                  }) => [
                    html.tag('dt',
                      language.$('artistPage.creditList.flashAct.withDateRange', {
                        act: link.flash(chunk[0].flash, {
                          text: act.name,
                        }),
                        dateRange: language.formatDateRange(
                          dateFirst,
                          dateLast
                        ),
                      })),

                    html.tag('dd',
                      html.tag('ul',
                        chunk
                          .map(({flash, ...props}) => ({
                            ...props,
                            entry: language.$('artistPage.creditList.entry.flash', {
                              flash: link.flash(flash),
                            }),
                          }))
                          .map(opts => generateEntryAccents({
                            getArtistString,
                            language,
                            ...opts,
                          }))
                          .map(row => html.tag('li', row)))),
                  ])),
              ]),

            ...html.fragment(
              !empty(commentaryThings) && [
                html.tag('h2',
                  {id: 'commentary'},
                  language.$('artistPage.commentaryList.title')),

                html.tag('dl',
                  commentaryListChunks.flatMap(({album, chunk}) => [
                    html.tag('dt',
                      language.$('artistPage.creditList.album', {
                        album: link.album(album),
                      })),

                    html.tag('dd',
                      html.tag('ul',
                        chunk
                          .map(({track}) => track
                            ? language.$('artistPage.creditList.entry.track', {
                                track: link.track(track),
                              })
                            : html.tag('i',
                                language.$('artistPage.creditList.entry.album.commentary')))
                          .map(row => html.tag('li', row)))),
                  ])),
              ]),
          ],
        },

        nav: generateNavForArtist(artist, false, hasGallery, {
          generateInfoGalleryLinks,
          link,
          language,
          wikiData,
        }),
      };
    },
  };

  const galleryPage = hasGallery && {
    type: 'page',
    path: ['artistGallery', artist.directory],
    page: ({
      generateInfoGalleryLinks,
      getAlbumCover,
      getGridHTML,
      getTrackCover,
      html,
      link,
      language,
    }) => ({
      title: language.$('artistGalleryPage.title', {artist: name}),

      main: {
        classes: ['top-index'],
        content: [
          html.tag('h1',
            language.$('artistGalleryPage.title', {
              artist: name,
            })),

          html.tag('p',
            {class: 'quick-info'},
            language.$('artistGalleryPage.infoLine', {
              coverArts: language.countCoverArts(artThingsGallery.length, {
                unit: true,
              }),
            })),

          html.tag('div',
            {class: 'grid-listing'},
            getGridHTML({
              entries: artThingsGallery.map((item) => ({item})),
              srcFn: (thing) =>
                thing.album
                  ? getTrackCover(thing)
                  : getAlbumCover(thing),
              linkFn: (thing, opts) =>
                thing.album
                  ? link.track(thing, opts)
                  : link.album(thing, opts),
            })),
        ],
      },

      nav: generateNavForArtist(artist, true, hasGallery, {
        generateInfoGalleryLinks,
        link,
        language,
        wikiData,
      }),
    }),
  };

  return [data, infoPage, galleryPage].filter(Boolean);
}

// Utility functions

function generateNavForArtist(artist, isGallery, hasGallery, {
  generateInfoGalleryLinks,
  language,
  link,
  wikiData,
}) {
  const {wikiInfo} = wikiData;

  const infoGalleryLinks =
    hasGallery &&
    generateInfoGalleryLinks(artist, isGallery, {
      link,
      language,
      linkKeyGallery: 'artistGallery',
      linkKeyInfo: 'artist',
    });

  return {
    linkContainerClasses: ['nav-links-hierarchy'],
    links: [
      {toHome: true},
      wikiInfo.enableListings && {
        path: ['localized.listingIndex'],
        title: language.$('listingIndex.title'),
      },
      {
        html: language.$('artistPage.nav.artist', {
          artist: link.artist(artist, {class: 'current'}),
        }),
      },
      hasGallery && {
        divider: false,
        html: `(${infoGalleryLinks})`,
      },
    ],
  };
}
