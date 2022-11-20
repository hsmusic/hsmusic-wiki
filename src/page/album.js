/** @format */

// Album page specification.

import {bindOpts, compareArrays} from '../util/sugar.js';

import {
  getAlbumCover,
  getAlbumListTag,
  getTotalDuration,
} from '../util/wiki-data.js';

export function targets({wikiData}) {
  return wikiData.albumData;
}

export function write(album, {wikiData}) {
  const unbound_trackToListItem = (track, {
    getArtistString,
    getLinkThemeString,
    html,
    language,
    link,
  }) => {
    const itemOpts = {
      duration: language.formatDuration(track.duration ?? 0),
      track: link.track(track),
    };
    return html.tag('li',
      {style: getLinkThemeString(track.color)},
      compareArrays(
        track.artistContribs.map((c) => c.who),
        album.artistContribs.map((c) => c.who),
        {checkOrder: false}
      )
        ? language.$('trackList.item.withDuration', itemOpts)
        : language.$('trackList.item.withDuration.withArtists', {
            ...itemOpts,
            by: html.tag('span',
              {class: 'by'},
              language.$('trackList.item.withArtists.by', {
                artists: getArtistString(track.artistContribs),
              })),
          }));
  };

  const hasCommentaryEntries =
    [album, ...album.tracks].filter((x) => x.commentary).length > 0;
  const hasAdditionalFiles = album.additionalFiles?.length > 0;
  const albumDuration = getTotalDuration(album.tracks);

  const displayTrackGroups =
    album.trackGroups &&
      (album.trackGroups.length > 1 ||
        !album.trackGroups[0].isDefaultTrackGroup);

  const listTag = getAlbumListTag(album);

  const data = {
    type: 'data',
    path: ['album', album.directory],
    data: ({
      serializeContribs,
      serializeCover,
      serializeGroupsForAlbum,
      serializeLink,
    }) => ({
      name: album.name,
      directory: album.directory,
      dates: {
        released: album.date,
        trackArtAdded: album.trackArtDate,
        coverArtAdded: album.coverArtDate,
        addedToWiki: album.dateAddedToWiki,
      },
      duration: albumDuration,
      color: album.color,
      cover: serializeCover(album, getAlbumCover),
      artistContribs: serializeContribs(album.artistContribs),
      coverArtistContribs: serializeContribs(album.coverArtistContribs),
      wallpaperArtistContribs: serializeContribs(album.wallpaperArtistContribs),
      bannerArtistContribs: serializeContribs(album.bannerArtistContribs),
      groups: serializeGroupsForAlbum(album),
      trackGroups: album.trackGroups?.map((trackGroup) => ({
        name: trackGroup.name,
        color: trackGroup.color,
        tracks: trackGroup.tracks.map((track) => track.directory),
      })),
      tracks: album.tracks.map((track) => ({
        link: serializeLink(track),
        duration: track.duration,
      })),
    }),
  };

  const page = {
    type: 'page',
    path: ['album', album.directory],
    page: ({
      fancifyURL,
      generateAdditionalFilesShortcut,
      generateAdditionalFilesList,
      generateChronologyLinks,
      generateCoverLink,
      generateNavigationLinks,
      getAlbumCover,
      getAlbumStylesheet,
      getArtistString,
      getLinkThemeString,
      getSizeOfAdditionalFile,
      getThemeString,
      html,
      link,
      language,
      transformMultiline,
      urls,
    }) => {
      const trackToListItem = bindOpts(unbound_trackToListItem, {
        getArtistString,
        getLinkThemeString,
        html,
        language,
        link,
      });

      const cover = getAlbumCover(album);

      return {
        title: language.$('albumPage.title', {album: album.name}),
        stylesheet: getAlbumStylesheet(album),
        theme: getThemeString(album.color, [
          `--album-directory: ${album.directory}`,
        ]),

        banner: album.bannerArtistContribs.length && {
          dimensions: album.bannerDimensions,
          path: [
            'media.albumBanner',
            album.directory,
            album.bannerFileExtension,
          ],
          alt: language.$('misc.alt.albumBanner'),
          position: 'top',
        },

        main: {
          content: [
            cover && generateCoverLink({
              src: cover,
              alt: language.$('misc.alt.albumCover'),
              tags: album.artTags,
            }),

            html.tag('h1', language.$('albumPage.title', {
              album: album.name,
            })),

            html.tag('p',
              {
                [html.onlyIfContent]: true,
                [html.joinChildren]: '<br>',
              },
              [
                album.artistContribs.length &&
                  language.$('releaseInfo.by', {
                    artists: getArtistString(album.artistContribs, {
                      showContrib: true,
                      showIcons: true,
                    }),
                  }),

                album.coverArtistContribs.length &&
                  language.$('releaseInfo.coverArtBy', {
                    artists: getArtistString(album.coverArtistContribs, {
                      showContrib: true,
                      showIcons: true,
                    }),
                  }),

                album.wallpaperArtistContribs.length &&
                  language.$('releaseInfo.wallpaperArtBy', {
                    artists: getArtistString(album.wallpaperArtistContribs, {
                      showContrib: true,
                      showIcons: true,
                    }),
                  }),

                album.bannerArtistContribs.length &&
                  language.$('releaseInfo.bannerArtBy', {
                    artists: getArtistString(album.bannerArtistContribs, {
                      showContrib: true,
                      showIcons: true,
                    }),
                  }),

                album.date &&
                  language.$('releaseInfo.released', {
                    date: language.formatDate(album.date),
                  }),

                album.coverArtDate &&
                +album.coverArtDate !== +album.date &&
                  language.$('releaseInfo.artReleased', {
                    date: language.formatDate(album.coverArtDate),
                  }),

                album.duration &&
                  language.$('releaseInfo.duration', {
                    duration: language.formatDuration(albumDuration, {
                      approximate: album.tracks.length > 1,
                    }),
                  }),
              ]),

            html.tag('p',
              {
                [html.onlyIfContent]: true,
                [html.joinChildren]: '<br>',
              },
              [
                hasAdditionalFiles &&
                  generateAdditionalFilesShortcut(album.additionalFiles),

                hasCommentaryEntries &&
                  language.$('releaseInfo.viewCommentary', {
                    link: link.albumCommentary(album, {
                      text: language.$('releaseInfo.viewCommentary.link'),
                    }),
                  }),
              ]),

            album.urls?.length &&
              html.tag('p',
                language.$('releaseInfo.listenOn', {
                  links: language.formatDisjunctionList(
                    album.urls.map(url => fancifyURL(url, {album: true}))
                  ),
                })),

            displayTrackGroups &&
              html.tag('dl',
                {class: 'album-group-list'},
                album.trackGroups.flatMap(({
                  name,
                  startIndex,
                  tracks,
                }) => [
                  html.tag('dt',
                    language.$('trackList.section.withDuration', {
                      duration: language.formatDuration(getTotalDuration(tracks), {
                        approximate: tracks.length > 1,
                      }),
                      section: name,
                    })),
                  html.tag('dd',
                    html.tag(listTag,
                      listTag === 'ol' ? {start: startIndex + 1} : {},
                      tracks.map(trackToListItem))),
                ])),

            !displayTrackGroups &&
              html.tag(listTag,
                album.tracks.map(trackToListItem)),

            html.tag('p',
              {
                [html.onlyIfContent]: true,
                [html.joinChildren]: '<br>',
              },
              [
                album.dateAddedToWiki &&
                  language.$('releaseInfo.addedToWiki', {
                    date: language.formatDate(
                      album.dateAddedToWiki
                    ),
                  })
              ]),

            ...html.fragment(
              hasAdditionalFiles &&
                generateAdditionalFilesList(album.additionalFiles, {
                  // TODO: Kinda near the metal here...
                  getFileSize: (file) =>
                    getSizeOfAdditionalFile(
                      urls.from('media.root').to(
                        'media.albumAdditionalFile',
                        album.directory,
                        file)),
                  linkFile: (file) =>
                    link.albumAdditionalFile({album, file}),
                })),

            ...album.commentary ? [
              html.tag('p', language.$('releaseInfo.artistCommentary')),
              html.tag('blockquote', transformMultiline(album.commentary)),
            ] : [],
          ],
        },

        sidebarLeft: generateAlbumSidebar(album, null, {
          fancifyURL,
          getLinkThemeString,
          html,
          link,
          language,
          transformMultiline,
          wikiData,
        }),

        nav: {
          linkContainerClasses: ['nav-links-hierarchy'],
          links: [
            {toHome: true},
            {
              html: language.$('albumPage.nav.album', {
                album: link.album(album, {class: 'current'}),
              }),
            },
          ],
          bottomRowContent: generateAlbumNavLinks(album, null, {
            generateNavigationLinks,
            html,
            language,
          }),
          content: generateAlbumChronologyLinks(album, null, {
            generateChronologyLinks,
            html,
          }),
        },

        secondaryNav: generateAlbumSecondaryNav(album, null, {
          getLinkThemeString,
          html,
          language,
          link,
        }),
      };
    },
  };

  return [page, data];
}

// Utility functions

export function generateAlbumSidebar(album, currentTrack, {
  fancifyURL,
  getLinkThemeString,
  html,
  language,
  link,
  transformMultiline,
}) {
  const isAlbumPage = !currentTrack;
  const isTrackPage = !!currentTrack;

  const listTag = getAlbumListTag(album);

  const {trackGroups} = album;

  const trackToListItem = (track) =>
    html.tag('li',
      {class: track === currentTrack && 'current'},
      language.$('albumSidebar.trackList.item', {
        track: link.track(track),
      }));

  const nameOrDefault = (isDefaultTrackGroup, name) =>
    isDefaultTrackGroup
      ? language.$('albumSidebar.trackList.fallbackGroupName')
      : name;

  const trackListPart = [
    html.tag('h1', link.album(album)),
    ...trackGroups.map(({name, color, startIndex, tracks, isDefaultTrackGroup}) => {
      const groupName =
        html.tag('span',
          {class: 'group-name'},
          nameOrDefault(
            isDefaultTrackGroup,
            name
          ));
      return html.tag('details',
        {
          // Leave side8ar track groups collapsed on al8um homepage,
          // since there's already a view of all the groups expanded
          // in the main content area.
          open: isTrackPage && tracks.includes(currentTrack),
          class: tracks.includes(currentTrack) && 'current',
        },
        [
          html.tag(
            'summary',
            {style: getLinkThemeString(color)},
            [
              listTag === 'ol' &&
                language.$('albumSidebar.trackList.group.withRange', {
                  group: groupName,
                  range: `${startIndex + 1}&ndash;${
                    startIndex + tracks.length
                  }`,
                }),
              listTag === 'ul' &&
                language.$('albumSidebar.trackList.group', {
                  group: groupName,
                }),
            ]),
          html.tag(listTag,
            listTag === 'ol' ? {start: startIndex + 1} : {},
            tracks.map(trackToListItem)),
        ]);
    }),
  ];

  const {groups} = album;

  const groupParts = groups
    .map((group) => {
      const albums = group.albums.filter((album) => album.date);
      const index = albums.indexOf(album);
      const next = index >= 0 && albums[index + 1];
      const previous = index > 0 && albums[index - 1];
      return {group, next, previous};
    })
    // This is a map and not a flatMap because the distinction between which
    // group sets of elements belong to matters. That means this variable is an
    // array of arrays, and we'll need to treat it as such later!
    .map(({group, next, previous}) => [
      html.tag('h1', language.$('albumSidebar.groupBox.title', {
        group: link.groupInfo(group),
      })),

      isAlbumPage &&
        transformMultiline(group.descriptionShort),

      group.urls?.length &&
        html.tag('p', language.$('releaseInfo.visitOn', {
          links: language.formatDisjunctionList(
            group.urls.map((url) => fancifyURL(url))
          ),
        })),

      ...isAlbumPage ? [
        next &&
          html.tag('p',
            {class: 'group-chronology-link'},
            language.$('albumSidebar.groupBox.next', {
              album: link.album(next),
            })),

        previous &&
          html.tag('p',
            {class: 'group-chronology-link'},
            language.$('albumSidebar.groupBox.previous', {
              album: link.album(previous),
            })),
      ] : [],
    ]);

  if (groupParts.length) {
    if (isTrackPage) {
      const combinedGroupPart =
        groupParts
          .map(groupPart => groupPart.filter(Boolean).join('\n'))
          .join('\n<hr>\n');
      return {
        multiple: [trackListPart, combinedGroupPart],
      };
    } else {
      return {
        multiple: [...groupParts, trackListPart],
      };
    }
  } else {
    return {
      content: trackListPart,
    };
  }
}

export function generateAlbumSecondaryNav(album, currentTrack, {
  getLinkThemeString,
  html,
  language,
  link,
}) {
  const isAlbumPage = !currentTrack;

  const {groups} = album;

  if (!groups.length) {
    return null;
  }

  const groupParts = groups
    .map((group) => {
      const albums = group.albums.filter((album) => album.date);
      const index = albums.indexOf(album);
      const next = index >= 0 && albums[index + 1];
      const previous = index > 0 && albums[index - 1];
      return {group, next, previous};
    })
    .map(({group, next, previous}) => {
      const previousNext =
        isAlbumPage &&
          [
            previous &&
              link.album(previous, {
                color: false,
                text: language.$('misc.nav.previous'),
              }),
            next &&
              link.album(next, {
                color: false,
                text: language.$('misc.nav.next'),
              }),
          ].filter(Boolean);
      return html.tag('span',
        {style: getLinkThemeString(group.color)}, [
        language.$('albumSidebar.groupBox.title', {
          group: link.groupInfo(group),
        }),
        previousNext?.length && `(${previousNext.join(',\n')})`,
      ]);
    });

  return {
    classes: ['nav-links-groups'],
    content: groupParts,
  };
}

export function generateAlbumNavLinks(album, currentTrack, {
  generateNavigationLinks,
  html,
  language,
}) {
  const isTrackPage = !!currentTrack;

  if (album.tracks.length <= 1) {
    return '';
  }

  const randomLink = html.tag('a',
    {
      href: '#',
      dataRandom: 'track-in-album',
      id: 'random-button'
    },
    (isTrackPage
      ? language.$('trackPage.nav.random')
      : language.$('albumPage.nav.randomTrack')));

  const navigationLinks =
    generateNavigationLinks(currentTrack, {
      additionalLinks: [randomLink],
      data: album.tracks,
      linkKey: 'track',
    });

  return `(${navigationLinks})`;
}

export function generateAlbumChronologyLinks(album, currentTrack, {
  generateChronologyLinks,
  html,
}) {
  const isTrackPage = !!currentTrack;

  return html.tag(
    'div',
    {
      [html.onlyIfContent]: true,
      class: 'nav-chronology-links',
    },
    [
      isTrackPage &&
        generateChronologyLinks(currentTrack, {
          contribKey: 'artistContribs',
          getThings: (artist) => [
            ...artist.tracksAsArtist,
            ...artist.tracksAsContributor,
          ],
          headingString: 'misc.chronology.heading.track',
        }),

      isTrackPage &&
        generateChronologyLinks(currentTrack, {
          contribKey: 'contributorContribs',
          getThings: (artist) => [
            ...artist.tracksAsArtist,
            ...artist.tracksAsContributor,
          ],
          headingString: 'misc.chronology.heading.track',
        }),

      generateChronologyLinks(currentTrack || album, {
        contribKey: 'coverArtistContribs',
        dateKey: 'coverArtDate',
        getThings: (artist) => [
          ...artist.albumsAsCoverArtist,
          ...artist.tracksAsCoverArtist,
        ],
        headingString: 'misc.chronology.heading.coverArt',
      }),
    ]);
}
