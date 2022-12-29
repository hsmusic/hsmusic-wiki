// Album page specification.

import {
  bindOpts,
  compareArrays,
  empty,
} from '../util/sugar.js';

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

  const hasAdditionalFiles = !empty(album.additionalFiles);
  const albumDuration = getTotalDuration(album.tracks);

  const displayTrackGroups =
    album.trackGroups &&
      (album.trackGroups.length > 1 ||
        !album.trackGroups[0].isDefaultTrackGroup);

  const listTag = getAlbumListTag(album);

  const getSocialEmbedDescription = ({
    getArtistString: _getArtistString,
    language,
  }) => {
    const hasDuration = albumDuration > 0;
    const hasTracks = album.tracks.length > 0;
    const hasDate = !!album.date;
    if (!hasDuration && !hasTracks && !hasDate) return '';

    return language.formatString(
      'albumPage.socialEmbed.body' + [
        hasDuration && '.withDuration',
        hasTracks && '.withTracks',
        hasDate && '.withReleaseDate',
      ].filter(Boolean).join(''),
      Object.fromEntries([
        hasDuration &&
          ['duration', language.formatDuration(albumDuration)],
        hasTracks &&
          ['tracks', language.countTracks(album.tracks.length, {unit: true})],
        hasDate &&
          ['date', language.formatDate(album.date)],
      ].filter(Boolean)));
  };

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

  const infoPage = {
    type: 'page',
    path: ['album', album.directory],
    page: ({
      absoluteTo,
      fancifyURL,
      generateAdditionalFilesShortcut,
      generateAdditionalFilesList,
      generateChronologyLinks,
      generateCoverLink,
      generateNavigationLinks,
      generateStickyHeadingContainer,
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

        themeColor: album.color,
        theme:
          getThemeString(album.color, {
            additionalVariables: [
              `--album-directory: ${album.directory}`,
            ],
          }),

        socialEmbed: {
          heading:
            (empty(album.groups)
              ? ''
              : language.$('albumPage.socialEmbed.heading', {
                  group: album.groups[0].name,
                })),
          headingLink:
            (empty(album.groups)
              ? null
              : absoluteTo('localized.album', album.groups[0].directory)),
          title: language.$('albumPage.socialEmbed.title', {
            album: album.name,
          }),
          description: getSocialEmbedDescription({getArtistString, language}),
          image: '/' + getAlbumCover(album, {to: urls.from('shared.root').to}),
          color: album.color,
        },

        banner: !empty(album.bannerArtistContribs) && {
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
            generateStickyHeadingContainer({
              title: language.$('albumPage.title', {album: album.name}),

              coverSrc: cover,
              coverAlt: language.$('misc.alt.albumCover'),
              coverTags: album.artTags,
            }),

            cover && generateCoverLink({
              src: cover,
              alt: language.$('misc.alt.albumCover'),
              tags: album.artTags,
            }),

            html.tag('p',
              {
                [html.onlyIfContent]: true,
                [html.joinChildren]: '<br>',
              },
              [
                !empty(album.artistContribs) &&
                  language.$('releaseInfo.by', {
                    artists: getArtistString(album.artistContribs, {
                      showContrib: true,
                      showIcons: true,
                    }),
                  }),

                !empty(album.coverArtistContribs) &&
                  language.$('releaseInfo.coverArtBy', {
                    artists: getArtistString(album.coverArtistContribs, {
                      showContrib: true,
                      showIcons: true,
                    }),
                  }),

                !empty(album.wallpaperArtistContribs) &&
                  language.$('releaseInfo.wallpaperArtBy', {
                    artists: getArtistString(album.wallpaperArtistContribs, {
                      showContrib: true,
                      showIcons: true,
                    }),
                  }),

                !empty(album.bannerArtistContribs) &&
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

                albumDuration > 0 &&
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

                checkGalleryPage(album) &&
                  language.$('releaseInfo.viewGallery', {
                    link: link.albumGallery(album, {
                      text: language.$('releaseInfo.viewGallery.link'),
                    }),
                  }),

                checkCommentaryPage(album) &&
                  language.$('releaseInfo.viewCommentary', {
                    link: link.albumCommentary(album, {
                      text: language.$('releaseInfo.viewCommentary.link'),
                    }),
                  }),
              ]),

            !empty(album.urls) &&
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
                    {class: ['content-heading']},
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

            ...html.fragment(
              album.commentary && [
                html.tag('p',
                  {class: ['content-heading']},
                  language.$('releaseInfo.artistCommentary')),
                html.tag('blockquote', transformMultiline(album.commentary)),
              ]),
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
            {
              divider: false,
              html: generateAlbumNavLinks(album, null, {
                generateNavigationLinks,
                html,
                language,
                link,
              }),
            }
          ],
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

  // TODO: only gen if there are any tracks with art
  const galleryPage = {
    type: 'page',
    path: ['albumGallery', album.directory],
    page: ({
      // generateInfoGalleryLinks,
      // generateNavigationLinks,
      getAlbumCover,
      getAlbumStylesheet,
      getGridHTML,
      getTrackCover,
      // getLinkThemeString,
      getThemeString,
      html,
      language,
      link,
    }) => ({
      title: language.$('albumGalleryPage.title', {album: album.name}),
      stylesheet: getAlbumStylesheet(album),

      themeColor: album.color,
      theme: getThemeString(album.color),

      main: {
        classes: ['top-index'],
        content: [
          html.tag('h1',
            language.$('albumGalleryPage.title', {
              album: album.name,
            })),

          html.tag('p',
            {class: 'quick-info'},
            (album.date
              ? language.$('albumGalleryPage.infoLine.withDate', {
                  tracks: html.tag('b',
                    language.countTracks(album.tracks.length, {unit: true})),
                  duration: html.tag('b',
                    language.formatDuration(albumDuration, {unit: true})),
                  date: html.tag('b',
                    language.formatDate(album.date)),
                })
              : language.$('albumGalleryPage.infoLine', {
                  tracks: html.tag('b',
                    language.countTracks(album.tracks.length, {unit: true})),
                  duration: html.tag('b',
                    language.formatDuration(albumDuration, {unit: true})),
                }))),

          html.tag('div',
            {class: 'grid-listing'},
            getGridHTML({
              linkFn: (t, opts) => t.album ? link.track(t, opts) : link.album(t, opts),
              noSrcTextFn: t =>
                language.$('misc.albumGalleryGrid.noCoverArt', {
                  name: t.name,
                }),

              srcFn(t) {
                if (!t.album) {
                  return getAlbumCover(t);
                } else if (t.hasUniqueCoverArt) {
                  return getTrackCover(t);
                } else {
                  return null;
                }
              },

              entries: [
                // {item: album},
                ...album.tracks.map(track => ({item: track})),
              ],
            })),
        ],
      },

      nav: generateAlbumExtrasPageNav(album, 'gallery', {
        html,
        language,
        link,
      }),
    }),
  };

  return [
    infoPage,
    galleryPage,
    data,
  ];
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

      !empty(group.urls) &&
        html.tag('p', language.$('releaseInfo.visitOn', {
          links: language.formatDisjunctionList(
            group.urls.map((url) => fancifyURL(url))
          ),
        })),

      ...html.fragment(
        isAlbumPage && [
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
        ]),
    ]);

  if (empty(groupParts)) {
    return {
      stickyMode: 'column',
      content: trackListPart,
    };
  } else if (isTrackPage) {
    const combinedGroupPart = {
      classes: ['no-sticky-header'],
      content: groupParts
        .map(groupPart => groupPart.filter(Boolean).join('\n'))
        .join('\n<hr>\n'),
    };
    return {
      stickyMode: 'column',
      multiple: [trackListPart, combinedGroupPart],
    };
  } else {
    return {
      stickyMode: 'last',
      multiple: [...groupParts, trackListPart],
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

  if (empty(groups)) {
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
      const previousLink =
        isAlbumPage &&
        previous &&
          link.album(previous, {
            color: false,
            text: language.$('misc.nav.previous'),
          });
      const nextLink =
        isAlbumPage &&
        next &&
          link.album(next, {
            color: false,
            text: language.$('misc.nav.next'),
          });
      const links = [previousLink, nextLink].filter(Boolean);
      return html.tag('span',
        {style: getLinkThemeString(group.color)},
        [
          language.$('albumSidebar.groupBox.title', {
            group: link.groupInfo(group),
          }),
          !empty(links) && `(${language.formatUnitList(links)})`,
        ]);
    });

  return {
    classes: ['nav-links-groups'],
    content: groupParts,
  };
}

function checkGalleryPage(album) {
  return album.tracks.some(t => t.hasUniqueCoverArt);
}

function checkCommentaryPage(album) {
  return !!album.commentary || album.tracks.some(t => t.commentary);
}

export function generateAlbumNavLinks(album, currentTrack, {
  generateNavigationLinks,
  html,
  language,
  link,

  currentExtra = null,
  showTrackNavigation = true,
  showExtraLinks = null,
}) {
  const isTrackPage = !!currentTrack;

  showExtraLinks ??= currentTrack ? false : true;

  const extraLinks = showExtraLinks ? [
    checkGalleryPage(album) &&
      link.albumGallery(album, {
        class: [currentExtra === 'gallery' && 'current'],
        text: language.$('albumPage.nav.gallery'),
      }),

    checkCommentaryPage(album) &&
      link.albumCommentary(album, {
        class: [currentExtra === 'commentary' && 'current'],
        text: language.$('albumPage.nav.commentary'),
      }),
  ].filter(Boolean) : [];

  const previousNextLinks =
    showTrackNavigation &&
    album.tracks.length > 1 &&
      generateNavigationLinks(currentTrack, {
        data: album.tracks,
        linkKey: 'track',
        returnAsArray: true,
      })

  const randomLink =
    showTrackNavigation &&
    album.tracks.length > 1 &&
      html.tag('a',
        {
          href: '#',
          'data-random': 'track-in-album',
          id: 'random-button'
        },
        (isTrackPage
          ? language.$('trackPage.nav.random')
          : language.$('albumPage.nav.randomTrack')));

  const allLinks = [
    ...previousNextLinks || [],
    ...extraLinks || [],
    randomLink,
  ].filter(Boolean);

  return `(${language.formatUnitList(allLinks)})`;
}

export function generateAlbumExtrasPageNav(album, currentExtra, {
  html,
  language,
  link,
}) {
  return {
    linkContainerClasses: ['nav-links-hierarchy'],
    links: [
      {toHome: true},
      {
        html: language.$('albumPage.nav.album', {
          album: link.album(album, {class: 'current'}),
        }),
      },
      {
        divider: false,
        html: generateAlbumNavLinks(album, null, {
          currentExtra,
          showTrackNavigation: false,
          showExtraLinks: true,

          html,
          language,
          link,
        }),
      }
    ],
  };
}

export function generateAlbumChronologyLinks(album, currentTrack, {
  generateChronologyLinks,
  html,
}) {
  return html.tag(
    'div',
    {
      [html.onlyIfContent]: true,
      class: 'nav-chronology-links',
    },
    [
      ...html.fragment(
        currentTrack && [
          ...html.fragment(
            generateChronologyLinks(currentTrack, {
              contribKey: 'artistContribs',
              getThings: (artist) => [
                ...artist.tracksAsArtist,
                ...artist.tracksAsContributor,
              ],
              headingString: 'misc.chronology.heading.track',
            })),

          ...html.fragment(
            generateChronologyLinks(currentTrack, {
              contribKey: 'contributorContribs',
              getThings: (artist) => [
                ...artist.tracksAsArtist,
                ...artist.tracksAsContributor,
              ],
              headingString: 'misc.chronology.heading.track',
            })),
        ]),

      ...html.fragment(
        generateChronologyLinks(currentTrack || album, {
          contribKey: 'coverArtistContribs',
          dateKey: 'coverArtDate',
          getThings: (artist) => [
            ...artist.albumsAsCoverArtist,
            ...artist.tracksAsCoverArtist,
          ],
          headingString: 'misc.chronology.heading.coverArt',
        })),
    ]);
}
