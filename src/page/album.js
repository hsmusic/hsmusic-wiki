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

import {
  generateContributionLinks as u_generateContributionLinks,
} from '../misc-templates.js';

import u_link from '../util/link.js';

export const description = `per-album info & track artwork gallery pages`;

export function targets({wikiData}) {
  return wikiData.albumData;
}

export const dataSteps = {
  computePathsForTarget(data, album) {
    data.hasGalleryPage = album.tracks.some(t => t.hasUniqueCoverArt);
    data.hasCommentaryPage = !!album.commentary || album.tracks.some(t => t.commentary);;

    return [
      {
        type: 'page',
        path: ['album', album.directory],
      },

      data.hasGalleryPage && {
        type: 'page',
        path: ['albumGallery', album.directory],
      },

      data.hasCommentaryPage && {
        type: 'page',
        path: ['albumCommentary', album.directory],
      },

      {
        type: 'data',
        path: ['album', album.directory],
      },
    ];
  },

  computeDataCommonAcrossMixedWrites(data, album) {
    data.albumDuration = getTotalDuration(album.tracks);
  },

  computeDataCommonAcrossPageWrites(data, album) {
    data.listTag = getAlbumListTag(album);
  },

  computeDataForPageWrite: {
    album(data, album, _pathArgs) {
      data.hasAdditionalFiles = !empty(album.additionalFiles);
      data.numAdditionalFiles = album.additionalFiles.flatMap((g) => g.files).length;

      data.displayTrackSections =
        album.trackSections &&
          (album.trackSections.length > 1 ||
            !album.trackSections[0]?.isDefaultTrackSection);
    },
  },

  computeContentForPageWrite: {
    album(data, {
      absoluteTo,
      fancifyURL,
      generateAdditionalFilesShortcut,
      generateAdditionalFilesList,
      generateChronologyLinks,
      generateContributionLinks,
      generateContentHeading,
      generateNavigationLinks,
      getAlbumCover,
      getAlbumStylesheet,
      getLinkThemeString,
      getSizeOfAdditionalFile,
      getThemeString,
      html,
      link,
      language,
      transformMultiline,
      urls,
    }) {
      const generateTrackListItem = bindOpts(u_generateTrackListItem, {
        generateContributionLinks,
        getLinkThemeString,
        html,
        language,
        link,
      });

      void generateTrackListItem;
    },
  },
};

function u_generateTrackListItem(data, {
  generateContributionLinks,
  getLinkThemeString,
  html,
  language,
  link,
}) {
  const stringOpts = {
    duration: language.formatDuration(data.duration),
    track: link.track(data.linkData),
  };

  return html.tag('li',
    {style: getLinkThemeString(data.color)},
    (!data.showArtists
      ? language.$('trackList.item.withDuration', stringOpts)
      : language.$('trackList.item.withDuration.withArtists', {
          ...stringOpts,
          by:
            html.tag('span', {class: 'by'},
              language.$('trackList.item.withArtists.by', {
                artists: generateContributionLinks(data.contributionLinksData),
              })),
        })));
}

u_generateTrackListItem.data = track => {
  return {
    color: track.color,
    duration: track.duration ?? 0,
    linkData: u_link.track.data(track),

    showArtists:
      !compareArrays(
        track.artistContribs.map((c) => c.who),
        track.album.artistContribs.map((c) => c.who),
        {checkOrder: false}),

    contributionLinksData:
      u_generateContributionLinks.data(track.artistContribs, {
        showContribution: false,
        showIcons: false,
      }),
  };
};

/*
export function write(album, {wikiData}) {
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
      trackSections: album.trackSections?.map((section) => ({
        name: section.name,
        color: section.color,
        tracks: section.tracks.map((track) => track.directory),
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
    }) => {
      const trackToListItem = bindOpts(unbound_trackToListItem, {
        getArtistString,
        getLinkThemeString,
        html,
        language,
        link,
      });

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

        cover: {
          src: getAlbumCover(album),
          alt: language.$('misc.alt.albumCover'),
          artTags: album.artTags,
        },

        main: {
          headingMode: 'sticky',

          content: [
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

                album.hasCoverArt &&
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

            displayTrackSections &&
            !empty(album.trackSections) &&
              html.tag('dl',
                {class: 'album-group-list'},
                album.trackSections.flatMap(({
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

            !displayTrackSections &&
            !empty(album.tracks) &&
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
              hasAdditionalFiles && [
                generateContentHeading({
                  id: 'additional-files',
                  title: language.$('releaseInfo.additionalFiles.heading', {
                    additionalFiles: language.countAdditionalFiles(numAdditionalFiles, {
                      unit: true,
                    }),
                  }),
                }),

                generateAlbumAdditionalFilesList(album, album.additionalFiles, {
                  generateAdditionalFilesList,
                  getSizeOfAdditionalFile,
                  link,
                  urls,
                }),
              ]),

            ...html.fragment(
              album.commentary && [
                generateContentHeading({
                  id: 'artist-commentary',
                  title: language.$('releaseInfo.artistCommentary'),
                }),

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
        headingMode: 'static',

        content: [
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

  const {trackSections} = album;

  const trackToListItem = (track) =>
    html.tag('li',
      {class: track === currentTrack && 'current'},
      language.$('albumSidebar.trackList.item', {
        track: link.track(track),
      }));

  const nameOrDefault = (isDefaultTrackSection, name) =>
    isDefaultTrackSection
      ? language.$('albumSidebar.trackList.fallbackSectionName')
      : name;

  const trackListPart = [
    html.tag('h1', link.album(album)),
    ...trackSections.map(({name, color, startIndex, tracks, isDefaultTrackSection}) => {
      const groupName =
        html.tag('span',
          {class: 'group-name'},
          nameOrDefault(
            isDefaultTrackSection,
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
            html.tag('span', [
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
            ])),
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

  if (empty(allLinks)) {
    return '';
  }

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

export function generateAlbumAdditionalFilesList(album, additionalFiles, {
  fileSize = true,

  generateAdditionalFilesList,
  getSizeOfAdditionalFile,
  link,
  urls,
}) {
  return generateAdditionalFilesList(additionalFiles, {
    getFileSize:
      (fileSize
        ? (file) =>
            // TODO: Kinda near the metal here...
            getSizeOfAdditionalFile(
              urls
                .from('media.root')
                .to('media.albumAdditionalFile', album.directory, file))
        : () => null),
    linkFile: (file) =>
      link.albumAdditionalFile({album, file}),
  });
}
*/
