export const description = `per-album info, artwork gallery & commentary pages`;

export function targets({wikiData}) {
  return wikiData.albumData;
}

export function pathsForTarget(album) {
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

    {
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

    /*
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

export function pathsTargetless({wikiData: {wikiInfo}}) {
  return [
    {
      type: 'page',
      path: ['commentaryIndex'],
      contentFunction: {name: 'generateCommentaryIndexPage'},
    },

    wikiInfo.canonicalBase === 'https://hsmusic.wiki/' &&
      {
        type: 'redirect',
        fromPath: ['page', 'list/all-commentary'],
        toPath: ['commentaryIndex'],
        title: 'Album Commentary',
      },
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
*/
