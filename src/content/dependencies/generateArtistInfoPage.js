import {empty, filterProperties, unique} from '../../util/sugar.js';

import {
  chunkByProperties,
  sortAlbumsTracksChronologically,
} from '../../util/wiki-data.js';

export default {
  contentDependencies: [
    'generateArtistNavLinks',
    'generateContentHeading',
    'generatePageLayout',
    'linkAlbum',
    'linkArtist',
    'linkArtistGallery',
    'linkTrack',
  ],

  extraDependencies: ['html', 'language'],

  relations(relation, artist) {
    const relations = {};
    const sections = relations.sections = {};

    relations.layout =
      relation('generatePageLayout');

    relations.artistNavLinks =
      relation('generateArtistNavLinks', artist);

    const processContribs = (...contribArrays) => {
      const properties = {};

      const ownContribs =
        contribArrays
          .map(contribs => contribs.find(({who}) => who === artist))
          .filter(Boolean);

      const contributionDescriptions =
        ownContribs
          .map(({what}) => what)
          .filter(Boolean);

      if (!empty(contributionDescriptions)) {
        properties.contributionDescriptions = contributionDescriptions;
      }

      const otherArtistContribs =
        contribArrays
          .map(contribs => contribs.filter(({who}) => who !== artist))
          .flat();

      if (!empty(otherArtistContribs)) {
        properties.otherArtistLinks =
          otherArtistContribs
            .map(({who}) => relation('linkArtist', who));
      }

      return properties;
    };

    const sortContributionEntries = (entries, sortFunction) => {
      const things = unique(entries.map(({thing}) => thing));
      sortFunction(things);

      const outputArrays = [];
      const thingToOutputArray = [];

      for (const thing of things) {
        const array = [];
        thingToOutputArray[thing] = array;
        outputArrays.push(array);
      }

      for (const entry of entries) {
        thingToOutputArray[entry.thing].push(entry);
      }

      return outputArrays.flat();
    };

    // TODO: Add and integrate wallpaper and banner date fields (#90)
    const artContributionEntries = [
      ...artist.albumsAsCoverArtist.map(album => ({
        kind: 'albumCover',
        date: album.coverArtDate,
        thing: album,
        album: album,
        ...processContribs(album.coverArtistContribs),
      })),

      ...artist.albumsAsWallpaperArtist.map(album => ({
        kind: 'albumWallpaper',
        date: album.coverArtDate,
        thing: album,
        album: album,
        ...processContribs(album.wallpaperArtistContribs),
      })),

      ...artist.albumsAsBannerArtist.map(album => ({
        kind: 'albumBanner',
        date: album.coverArtDate,
        thing: album,
        album: album,
        ...processContribs(album.bannerArtistContribs),
      })),

      ...artist.tracksAsCoverArtist.map(track => ({
        kind: 'trackCover',
        date: track.coverArtDate,
        thing: track,
        album: track.album,
        rerelease: track.originalReleaseTrack !== null,
        trackLink: relation('linkTrack', track),
        ...processContribs(track.coverArtistContribs),
      })),
    ];

    sortContributionEntries(artContributionEntries, sortAlbumsTracksChronologically);

    const artContributionChunks =
      chunkByProperties(artContributionEntries, ['album', 'date'])
        .map(({album, date, chunk}) => ({
          albumLink: relation('linkAlbum', album),
          date: +date,
          entries:
            chunk.map(entry =>
              filterProperties(entry, [
                'contributionDescriptions',
                'kind',
                'otherArtistLinks',
                'rerelease',
                'trackLink',
              ])),
        }));

    if (!empty(artContributionChunks)) {
      const artworks = sections.artworks = {};
      artworks.heading = relation('generateContentHeading');
      artworks.chunks = artContributionChunks;

      if (
        !empty(artist.albumsAsCoverArtist) ||
        !empty(artist.tracksAsCoverArtist)
      ) {
        artworks.artistGalleryLink =
          relation('linkArtistGallery', artist);
      }
    }

    // Commentary doesn't use the detailed contribution system where multiple
    // artists are collaboratively credited for the same piece, so there isn't
    // really anything special to do for processing or presenting it.

    const commentaryEntries = [
      ...artist.albumsAsCommentator.map(album => ({
        kind: 'albumCommentary',
        date: album.date,
        thing: album,
        album: album,
      })),

      ...artist.tracksAsCommentator.map(track => ({
        kind: 'trackCommentary',
        date: track.date,
        thing: track,
        album: track.album,
        trackLink: relation('linkTrack', track),
      })),
    ];

    sortContributionEntries(commentaryEntries, sortAlbumsTracksChronologically);

    // We still pass through (and chunk by) date here, even though it doesn't
    // actually get displayed on the album page. See issue #193.
    const commentaryChunks =
      chunkByProperties(commentaryEntries, ['album', 'date'])
        .map(({album, date, chunk}) => ({
          albumLink: relation('linkAlbum', album),
          date: +date,
          entries:
            chunk.map(entry =>
              filterProperties(entry, [
                'kind',
                'trackLink',
              ])),
        }));

    if (!empty(commentaryChunks)) {
      const commentary = sections.commentary = {};
      commentary.heading = relation('generateContentHeading');
      commentary.chunks = commentaryChunks;
    }

    return relations;
  },

  data(artist) {
    return {
      name: artist.name,
    };
  },

  generate(data, relations, {html, language}) {
    const {sections: sec} = relations;

    const addAccentsToEntry = ({
      rerelease,
      entry,
      otherArtistLinks,
      contributionDescriptions,
    }) => {
      if (rerelease) {
        return language.$('artistPage.creditList.entry.rerelease', {entry});
      }

      const options = {entry};
      const parts = ['artistPage.creditList.entry'];

      if (otherArtistLinks) {
        parts.push('withArtists');
        options.artists = language.formatConjunctionList(otherArtistLinks);
      }

      if (contributionDescriptions) {
        parts.push('withContribution');
        options.contribution = language.formatUnitList(contributionDescriptions);
      }

      if (parts.length === 1) {
        return entry;
      }

      return language.formatString(parts.join('.'), options);
    };

    return relations.layout
      .slots({
        title: data.name,
        headingMode: 'sticky',

        styleRules: [data.stylesheet].filter(Boolean),

        mainClasses: ['long-content'],
        mainContent: [
          sec.artworks && [
            sec.artworks.heading
              .slots({
                tag: 'h2',
                id: 'art',
                title: language.$('artistPage.artList.title'),
              }),

            sec.artworks.artistGalleryLink &&
              html.tag('p',
                language.$('artistPage.viewArtGallery.orBrowseList', {
                  link: sec.artworks.artistGalleryLink.slots({
                    content: language.$('artistPage.viewArtGallery.link'),
                  }),
                })),

            /*
            !empty(artGroups) &&
              html.tag('p',
                language.$('artistPage.artGroupsLine', {
                groups: language.formatUnitList(
                  artGroups.map(({groupLink, numContributions}) =>
                    language.$('artistPage.groupsLine.item', {
                      group: groupLink,
                      contributions:
                        language.countContributions(numContributions),
                    })
                  )
                ),
              })),
            */

            html.tag('dl',
              sec.artworks.chunks.map(({albumLink, date, entries}) => [
                html.tag('dt',
                  language.$('artistPage.creditList.album.withDate', {
                    album: albumLink,
                    date: language.formatDate(new Date(date)),
                  })),

                html.tag('dd',
                  html.tag('ul',
                    entries
                      .map(({kind, trackLink, ...properties}) => ({
                        entry:
                          (kind === 'trackCover'
                            ? language.$('artistPage.creditList.entry.track', {
                                track: trackLink,
                              })
                            : html.tag('i',
                                language.$('artistPage.creditList.entry.album.' + {
                                  albumWallpaper: 'wallpaperArt',
                                  albumBanner: 'bannerArt',
                                  albumCover: 'coverArt',
                                }[kind]))),
                        ...properties,
                      }))
                      .map(addAccentsToEntry)
                      .map(entry => html.tag('li', entry)))),
              ])),
          ],

          sec.commentary && [
            sec.commentary.heading
              .slots({
                tag: 'h2',
                id: 'commentary',
                title: language.$('artistPage.commentaryList.title'),
              }),

            html.tag('dl',
              sec.commentary.chunks.map(({albumLink, entries}) => [
                html.tag('dt',
                  language.$('artistPage.creditList.album', {
                    album: albumLink,
                  })),

                html.tag('dd',
                  html.tag('ul',
                    entries
                      .map(({kind, trackLink}) =>
                        (kind === 'trackCommentary'
                          ? language.$('artistPage.creditList.entry.track', {
                              track: trackLink,
                            })
                          : html.tag('i',
                              language.$('artistPage.creditList.entry.album.commentary'))))
                      .map(entry => html.tag('li', entry)))),
              ])),
          ],
        ],

        navLinkStyle: 'hierarchical',
        navLinks:
          relations.artistNavLinks
            .slots({
              showExtraLinks: true,
            })
            .content,
      });
  },
};

/*

export function write(artist, {wikiData}) {
  const {groupData, wikiInfo} = wikiData;

  const {name, urls, contextNotes} = artist;

  const getArtistsAndContrib = (thing, key) => ({
    artists: thing[key]?.filter(({who}) => who !== artist),
    contrib: thing[key]?.find(({who}) => who === artist),
    thing,
    key,
  });

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
        originalReleaseTrack: track.originalReleaseTrack,
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
      duration: getTotalDuration(chunk, {originalReleasesOnly: true}),
    }));

  const trackListChunks = chunkTracks(allTracks);
  const totalDuration = getTotalDuration(allTracks.filter(t => !t.originalReleaseTrack));

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

        cover: artist.hasAvatar && {
          src: getArtistAvatar(artist),
          alt: language.$('misc.alt.artistAvatar'),
        },

        main: {
          headingMode: 'sticky',

          content: [
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
                  {id: 'tracks', class: ['content-heading']},
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

            <art things>

            ...html.fragment(
              wikiInfo.enableFlashesAndGames &&
              !empty(flashes) && [
                html.tag('h2',
                  {id: 'flashes', class: ['content-heading']},
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

            <commentary>
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
        headingMode: 'static',

        content: [
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

*/
