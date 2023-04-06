// Album page specification.

export const description = `per-album info & track artwork gallery pages`;

export function targets({wikiData}) {
  return wikiData.albumData;
}

export function pathsForTarget(album) {
  const hasGalleryPage = album.tracks.some(t => t.hasUniqueCoverArt);
  const hasCommentaryPage = !!album.commentary || album.tracks.some(t => t.commentary);

  return [
    {
      type: 'page',
      path: ['album', album.directory],

      contentFunction: {
        name: 'generateAlbumInfoPage',
        args: [album],
      },
    },

    /*
    hasGalleryPage && {
      type: 'page',
      path: ['albumGallery', album.directory],

      contentFunction: {
        name: 'generateAlbumGalleryPage',
        args: [album],
      },
    },

    hasCommentaryPage && {
      type: 'page',
      path: ['albumCommentary', album.directory],

      contentFunction: {
        name: 'generateAlbumCommentaryPage',
        args: [album],
      },
    },

    {
      type: 'data',
      path: ['album', album.directory],

      contentFunction: {
        name: 'generateAlbumDataFile',
        args: [album],
      },
    },
    */
  ];
}

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
*/
