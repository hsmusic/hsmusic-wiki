import {empty} from '../../util/sugar.js';

export default {
  contentDependencies: [
    'generateContentHeading',
    'generateCoverArtwork',
    'linkAlbum',
    'linkContribution',
    'linkExternal',
    'linkTrack',
  ],

  extraDependencies: [
    'html',
    'language',
    'transformMultiline',
  ],

  relations(relation, track) {
    const relations = {};

    const {album} = track;

    const contributionLinksRelation = contribs =>
      contribs.map(contrib =>
        relation('linkContribution', contrib.who, contrib.what));

    if (track.hasUniqueCoverArt) {
      relations.cover =
        relation('generateCoverArtwork', track.artTags);
      relations.coverArtistLinks =
        contributionLinksRelation(track.coverArtistContribs);
    } else if (album.hasCoverArt) {
      relations.cover =
        relation('generateCoverArtwork', album.artTags);
      relations.coverArtistLinks = null;
    } else {
      relations.cover = null;
      relations.coverArtistLinks = null;
    }

    relations.artistLinks =
      contributionLinksRelation(track.artistContribs);

    relations.externalLinks =
      track.urls.map(url =>
        relation('linkExternal', url));

    relations.otherReleasesHeading =
      relation('generateContentHeading');

    relations.otherReleases =
      track.otherReleases.map(track => ({
        trackLink: relation('linkTrack', track),
        albumLink: relation('linkAlbum', track.album),
      }));

    if (!empty(track.contributorContribs)) {
      relations.contributorsHeading =
        relation('generateContentHeading');
      relations.contributorLinks =
        contributionLinksRelation(track.contributorContribs);
    }

    return relations;
  },

  data(track) {
    const data = {};

    const {album} = track;

    data.date = track.date;
    data.duration = track.duration;

    data.hasUniqueCoverArt = track.hasUniqueCoverArt;
    data.hasAlbumCoverArt = album.hasCoverArt;

    if (track.hasUniqueCoverArt) {
      data.albumCoverArtDirectory = album.directory;
      data.trackCoverArtDirectory = track.directory;
      data.coverArtFileExtension = track.coverArtFileExtension;

      if (track.coverArtDate && +track.coverArtDate !== +track.date) {
        data.coverArtDate = track.coverArtDate;
      }
    } else if (track.album.hasCoverArt) {
      data.albumCoverArtDirectory = album.directory;
      data.coverArtFileExtension = album.coverArtFileExtension;
    }

    return data;
  },

  generate(data, relations, {
    html,
    language,
    // transformMultiline,
  }) {
    const content = {};

    const formatContributions = contributionLinks =>
      language.formatConjunctionList(
        contributionLinks.map(link =>
          link
            .slots({
              showContribution: true,
              showIcons: true,
            })));

    if (data.hasUniqueCoverArt) {
      content.cover = relations.cover
        .slots({
          path: [
            'media.trackCover',
            data.albumCoverArtDirectory,
            data.trackCoverArtDirectory,
            data.coverArtFileExtension,
          ],
        });
    } else if (data.hasAlbumCoverArt) {
      content.cover = relations.cover
        .slots({
          path: [
            'media.albumCover',
            data.albumCoverArtDirectory,
            data.coverArtFileExtension,
          ],
        });
    } else {
      content.cover = null;
    }

    content.main = {
      headingMode: 'sticky',

      content: html.tags([
        html.tag('p', {
          [html.onlyIfContent]: true,
          [html.joinChildren]: html.tag('br'),
        }, [
          !empty(relations.artistLinks) &&
            language.$('releaseInfo.by', {
              artists: formatContributions(relations.artistLinks),
            }),

          !empty(relations.coverArtistLinks) &&
            language.$('releaseInfo.coverArtBy', {
              artists: formatContributions(relations.coverArtistLinks),
            }),

          data.date &&
            language.$('releaseInfo.released', {
              date: language.formatDate(data.date),
            }),

          data.coverArtDate &&
            language.$('releaseInfo.artReleased', {
              date: language.formatDate(data.coverArtDate),
            }),

          data.duration &&
            language.$('releaseInfo.duration', {
              duration: language.formatDuration(data.duration),
            }),
        ]),

        /*
        html.tag('p',
          {
            [html.onlyIfContent]: true,
            [html.joinChildren]: '<br>',
          },
          [
            hasSheetMusicFiles &&
              language.$('releaseInfo.sheetMusicFiles.shortcut', {
                link: html.tag('a',
                  {href: '#sheet-music-files'},
                  language.$('releaseInfo.sheetMusicFiles.shortcut.link')),
              }),

            hasMidiProjectFiles &&
              language.$('releaseInfo.midiProjectFiles.shortcut', {
                link: html.tag('a',
                  {href: '#midi-project-files'},
                  language.$('releaseInfo.midiProjectFiles.shortcut.link')),
              }),

            hasAdditionalFiles &&
              generateAdditionalFilesShortcut(track.additionalFiles),
          ]),
        */

        html.tag('p',
          (empty(relations.externalLinks)
            ? language.$('releaseInfo.listenOn.noLinks')
            : language.$('releaseInfo.listenOn', {
                links: language.formatDisjunctionList(relations.externalLinks),
              }))),

        !empty(relations.otherReleases) && [
          relations.otherReleasesHeading
            .slots({
              id: 'also-released-as',
              title: language.$('releaseInfo.alsoReleasedAs'),
            }),

          html.tag('ul',
            relations.otherReleases.map(({trackLink, albumLink}) =>
              html.tag('li',
                language.$('releaseInfo.alsoReleasedAs.item', {
                  track: trackLink,
                  album: albumLink,
                })))),
        ],

        relations.contributorLinks && [
          relations.contributorsHeading
            .slots({
              id: 'contributors',
              title: language.$('releaseInfo.contributors'),
            }),

          html.tag('ul', relations.contributorLinks.map(contributorLink =>
            html.tag('li',
              contributorLink
                .slots({
                  showIcons: true,
                  showContribution: true,
                })))),
        ],
      ]),
    };

    return content;
  },
};

/*
export function write(track, {wikiData}) {
  const {wikiInfo} = wikiData;

  const {album, contributorContribs, referencedByTracks, referencedTracks, sampledByTracks, sampledTracks, otherReleases, } = track;

  const listTag = getAlbumListTag(album);

  let flashesThatFeature;
  if (wikiInfo.enableFlashesAndGames) {
    flashesThatFeature = sortChronologically(
      [track, ...otherReleases].flatMap((track) =>
        track.featuredInFlashes.map((flash) => ({
          flash,
          as: track,
          directory: flash.directory,
          name: flash.name,
          date: flash.date,
        }))
      )
    );
  }

  const unbound_getTrackItem = (track, {
    getArtistString,
    html,
    language,
    link,
  }) =>
    html.tag('li',
      language.$('trackList.item.withArtists', {
        track: link.track(track),
        by: html.tag('span',
          {class: 'by'},
          language.$('trackList.item.withArtists.by', {
            artists: getArtistString(track.artistContribs),
          })),
      }));

  const hasCommentary =
    track.commentary || otherReleases.some((t) => t.commentary);

  const hasAdditionalFiles = !empty(track.additionalFiles);
  const hasSheetMusicFiles = !empty(track.sheetMusicFiles);
  const hasMidiProjectFiles = !empty(track.midiProjectFiles);
  const numAdditionalFiles = album.additionalFiles.flatMap((g) => g.files).length;

  const generateCommentary = ({language, link, transformMultiline}) =>
    transformMultiline([
      track.commentary,
      ...otherReleases.map((track) =>
        track.commentary
          ?.split('\n')
          .filter((line) => line.replace(/<\/b>/g, '').includes(':</i>'))
          .flatMap(line => [
            line,
            language.$('releaseInfo.artistCommentary.seeOriginalRelease', {
              original: link.track(track),
            }),
          ])
          .join('\n')
      ),
    ].filter(Boolean).join('\n'));

  const data = {
    type: 'data',
    path: ['track', track.directory],
    data: ({
      serializeContribs,
      serializeCover,
      serializeGroupsForTrack,
      serializeLink,
    }) => ({
      name: track.name,
      directory: track.directory,
      dates: {
        released: track.date,
        originallyReleased: track.originalDate,
        coverArtAdded: track.coverArtDate,
      },
      duration: track.duration,
      color: track.color,
      cover: serializeCover(track, getTrackCover),
      artistsContribs: serializeContribs(track.artistContribs),
      contributorContribs: serializeContribs(track.contributorContribs),
      coverArtistContribs: serializeContribs(track.coverArtistContribs || []),
      album: serializeLink(track.album),
      groups: serializeGroupsForTrack(track),
      references: track.references.map(serializeLink),
      referencedBy: track.referencedBy.map(serializeLink),
      alsoReleasedAs: otherReleases.map((track) => ({
        track: serializeLink(track),
        album: serializeLink(track.album),
      })),
    }),
  };

  const getSocialEmbedDescription = ({
    getArtistString: _getArtistString,
    language,
  }) => {
    const hasArtists = !empty(track.artistContribs);
    const hasCoverArtists = !empty(track.coverArtistContribs);
    const getArtistString = (contribs) =>
      _getArtistString(contribs, {
        // We don't want to put actual HTML tags in social embeds (sadly
        // they don't get parsed and displayed, generally speaking), so
        // override the link argument so that artist "links" just show
        // their names.
        link: {artist: (artist) => artist.name},
      });
    if (!hasArtists && !hasCoverArtists) return '';
    return language.formatString(
      'trackPage.socialEmbed.body' +
        [hasArtists && '.withArtists', hasCoverArtists && '.withCoverArtists']
          .filter(Boolean)
          .join(''),
      Object.fromEntries(
        [
          hasArtists && ['artists', getArtistString(track.artistContribs)],
          hasCoverArtists && [
            'coverArtists',
            getArtistString(track.coverArtistContribs),
          ],
        ].filter(Boolean)
      )
    );
  };

  const page = {
    type: 'page',
    path: ['track', track.directory],
    page: ({
      absoluteTo,
      fancifyURL,
      generateAdditionalFilesList,
      generateAdditionalFilesShortcut,
      generateChronologyLinks,
      generateContentHeading,
      generateNavigationLinks,
      generateTrackListDividedByGroups,
      getAlbumStylesheet,
      getArtistString,
      getLinkThemeString,
      getSizeOfAdditionalFile,
      getThemeString,
      getTrackCover,
      html,
      link,
      language,
      transformLyrics,
      transformMultiline,
      to,
      urls,
    }) => {
      const getTrackItem = bindOpts(unbound_getTrackItem, {
        getArtistString,
        html,
        language,
        link,
      });

      const generateAlbumAdditionalFilesList = bindOpts(unbound_generateAlbumAdditionalFilesList, {
        [bindOpts.bindIndex]: 2,
        generateAdditionalFilesList,
        getSizeOfAdditionalFile,
        link,
        urls,
      });

      return {
        title: language.$('trackPage.title', {track: track.name}),
        stylesheet: getAlbumStylesheet(album, {to}),

        themeColor: track.color,
        theme:
          getThemeString(track.color, {
            additionalVariables: [
              `--album-directory: ${album.directory}`,
              `--track-directory: ${track.directory}`,
            ]
          }),

        socialEmbed: {
          heading: language.$('trackPage.socialEmbed.heading', {
            album: track.album.name,
          }),
          headingLink: absoluteTo('localized.album', album.directory),
          title: language.$('trackPage.socialEmbed.title', {
            track: track.name,
          }),
          description: getSocialEmbedDescription({getArtistString, language}),
          image: '/' + getTrackCover(track, {to: urls.from('shared.root').to}),
          color: track.color,
        },

        // disabled for now! shifting banner position per height of page is disorienting
        /*
        banner: !empty(album.bannerArtistContribs) && {
          classes: ['dim'],
          dimensions: album.bannerDimensions,
          path: ['media.albumBanner', album.directory, album.bannerFileExtension],
          alt: language.$('misc.alt.albumBanner'),
          position: 'bottom'
        },
        * /

        main: {
          headingMode: 'sticky',

          content: [
            ...html.fragment(
              !empty(contributorContribs) && [
                generateContentHeading({
                  id: 'contributors',
                  title: language.$('releaseInfo.contributors'),
                }),

                html.tag('ul', contributorContribs.map(contrib =>
                  html.tag('li', getArtistString([contrib], {
                    showContrib: true,
                    showIcons: true,
                  })))),
              ]),

            ...html.fragment(
              !empty(referencedTracks) && [
                generateContentHeading({
                  id: 'references',
                  title:
                    language.$('releaseInfo.tracksReferenced', {
                      track: html.tag('i', track.name),
                    }),
                }),

                html.tag('ul', referencedTracks.map(getTrackItem)),
              ]),

            ...html.fragment(
              !empty(referencedByTracks) && [
                generateContentHeading({
                  id: 'referenced-by',
                  title:
                    language.$('releaseInfo.tracksThatReference', {
                      track: html.tag('i', track.name),
                    }),
                }),

                generateTrackListDividedByGroups(referencedByTracks, {
                  getTrackItem,
                  wikiData,
                }),
              ]),

            ...html.fragment(
              !empty(sampledTracks) && [
                generateContentHeading({
                  id: 'samples',
                  title:
                    language.$('releaseInfo.tracksSampled', {
                      track: html.tag('i', track.name),
                    }),
                }),

                html.tag('ul', sampledTracks.map(getTrackItem)),
              ]),

            ...html.fragment(
              !empty(sampledByTracks) && [
                generateContentHeading({
                  id: 'sampled-by',
                  title:
                    language.$('releaseInfo.tracksThatSample', {
                      track: html.tag('i', track.name),
                    })
                }),

                html.tag('ul', sampledByTracks.map(getTrackItem)),
              ]),

            ...html.fragment(
              wikiInfo.enableFlashesAndGames &&
              !empty(flashesThatFeature) && [
                generateContentHeading({
                  id: 'featured-in',
                  title:
                    language.$('releaseInfo.flashesThatFeature', {
                      track: html.tag('i', track.name),
                    }),
                }),

                html.tag('ul', flashesThatFeature.map(({flash, as}) =>
                  html.tag('li',
                    {class: as !== track && 'rerelease'},
                    (as === track
                      ? language.$('releaseInfo.flashesThatFeature.item', {
                        flash: link.flash(flash),
                      })
                      : language.$('releaseInfo.flashesThatFeature.item.asDifferentRelease', {
                        flash: link.flash(flash),
                        track: link.track(as),
                      }))))),
              ]),

            ...html.fragment(
              track.lyrics && [
                generateContentHeading({
                  id: 'lyrics',
                  title: language.$('releaseInfo.lyrics'),
                }),

                html.tag('blockquote', transformLyrics(track.lyrics)),
              ]),

            ...html.fragment(
              hasSheetMusicFiles && [
                generateContentHeading({
                  id: 'sheet-music-files',
                  title: language.$('releaseInfo.sheetMusicFiles.heading'),
                }),

                generateAlbumAdditionalFilesList(album, track.sheetMusicFiles, {
                  fileSize: false,
                }),
              ]),

            ...html.fragment(
              hasMidiProjectFiles && [
                generateContentHeading({
                  id: 'midi-project-files',
                  title: language.$('releaseInfo.midiProjectFiles.heading'),
                }),

                generateAlbumAdditionalFilesList(album, track.midiProjectFiles),
              ]),

            ...html.fragment(
              hasAdditionalFiles && [
                generateContentHeading({
                  id: 'additional-files',
                  title: language.$('releaseInfo.additionalFiles.heading', {
                    additionalFiles: language.countAdditionalFiles(numAdditionalFiles, {
                      unit: true,
                    }),
                  })
                }),

                generateAlbumAdditionalFilesList(album, track.additionalFiles),
              ]),

            ...html.fragment(
              hasCommentary && [
                generateContentHeading({
                  id: 'artist-commentary',
                  title: language.$('releaseInfo.artistCommentary'),
                }),

                html.tag('blockquote', generateCommentary({
                  link,
                  language,
                  transformMultiline,
                })),
              ]),
          ],
        },

        sidebarLeft: generateAlbumSidebar(album, track, {
          fancifyURL,
          getLinkThemeString,
          html,
          language,
          link,
          transformMultiline,
          wikiData,
        }),

        nav: {
          linkContainerClasses: ['nav-links-hierarchy'],
          links: [
            {toHome: true},
            {
              path: ['localized.album', album.directory],
              title: album.name,
            },
            listTag === 'ol' &&
              {
                html: language.$('trackPage.nav.track.withNumber', {
                  number: album.tracks.indexOf(track) + 1,
                  track: link.track(track, {class: 'current', to}),
                }),
              },
            listTag === 'ul' &&
              {
                html: language.$('trackPage.nav.track', {
                  track: link.track(track, {class: 'current', to}),
                }),
              },
          ].filter(Boolean),

          content: generateAlbumChronologyLinks(album, track, {
            generateChronologyLinks,
            html,
          }),

          bottomRowContent:
            album.tracks.length > 1 &&
              generateAlbumNavLinks(album, track, {
                generateNavigationLinks,
                html,
                language,
              }),
        },

        secondaryNav: generateAlbumSecondaryNav(album, track, {
          getLinkThemeString,
          html,
          language,
          link,
        }),
      };
    },
  };

  return [data, page];
}
*/
