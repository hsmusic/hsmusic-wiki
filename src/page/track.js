// Track page specification.

import {
  generateAlbumChronologyLinks,
  generateAlbumNavLinks,
  generateAlbumSecondaryNav,
  generateAlbumSidebar,
} from './album.js';

import {
  bindOpts,
  empty,
} from '../util/sugar.js';

import {
  getTrackCover,
  getAlbumListTag,
  sortChronologically,
} from '../util/wiki-data.js';

export const description = `per-track info pages`;

export function targets({wikiData}) {
  return wikiData.trackData;
}

export function write(track, {wikiData}) {
  const {wikiInfo} = wikiData;

  const {
    album,
    contributorContribs,
    referencedByTracks,
    referencedTracks,
    sampledByTracks,
    sampledTracks,
    otherReleases,
  } = track;

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
      generateChronologyLinks,
      generateNavigationLinks,
      generateTrackListDividedByGroups,
      getAlbumStylesheet,
      getArtistString,
      getLinkThemeString,
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
        */

        cover: {
          src: getTrackCover(track),
          alt: language.$('misc.alt.trackCover'),
          artTags: track.artTags,
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
                !empty(track.artistContribs) &&
                  language.$('releaseInfo.by', {
                    artists: getArtistString(track.artistContribs, {
                      showContrib: true,
                      showIcons: true,
                    }),
                  }),

                !empty(track.coverArtistContribs) &&
                  language.$('releaseInfo.coverArtBy', {
                    artists: getArtistString(track.coverArtistContribs, {
                      showContrib: true,
                      showIcons: true,
                    }),
                  }),

                track.date &&
                  language.$('releaseInfo.released', {
                    date: language.formatDate(track.date),
                  }),

                track.hasCoverArt &&
                track.coverArtDate &&
                +track.coverArtDate !== +track.date &&
                  language.$('releaseInfo.artReleased', {
                    date: language.formatDate(track.coverArtDate),
                  }),

                track.duration &&
                  language.$('releaseInfo.duration', {
                    duration: language.formatDuration(
                      track.duration
                    ),
                  }),
              ]),

            html.tag('p',
              (empty(track.urls)
                ? language.$('releaseInfo.listenOn.noLinks')
                : language.$('releaseInfo.listenOn', {
                    links: language.formatDisjunctionList(
                      track.urls.map(url => fancifyURL(url, {language}))),
                  }))),

            ...html.fragment(
              !empty(otherReleases) && [
                html.tag('p', {class: ['content-heading']},
                  language.$('releaseInfo.alsoReleasedAs')),

                html.tag('ul', otherReleases.map(track =>
                  html.tag('li', language.$('releaseInfo.alsoReleasedAs.item', {
                    track: link.track(track),
                    album: link.album(track.album),
                  })))),
              ]),

            ...html.fragment(
              !empty(contributorContribs) && [
                html.tag('p', {class: ['content-heading']},
                  language.$('releaseInfo.contributors')),

                html.tag('ul', contributorContribs.map(contrib =>
                  html.tag('li', getArtistString([contrib], {
                    showContrib: true,
                    showIcons: true,
                  })))),
              ]),

            ...html.fragment(
              !empty(referencedTracks) && [
                html.tag('p', {class: ['content-heading']},
                  language.$('releaseInfo.tracksReferenced', {
                    track: html.tag('i', track.name),
                  })),

                html.tag('ul', referencedTracks.map(getTrackItem)),
              ]),

            ...html.fragment(
              !empty(referencedByTracks) && [
                html.tag('p', {class: ['content-heading']},
                  language.$('releaseInfo.tracksThatReference', {
                    track: html.tag('i', track.name),
                  })),

                generateTrackListDividedByGroups(referencedByTracks, {
                  getTrackItem,
                  wikiData,
                }),
              ]),

            ...html.fragment(
              !empty(sampledTracks) && [
                html.tag('p', {class: ['content-heading']},
                  language.$('releaseInfo.tracksSampled', {
                    track: html.tag('i', track.name),
                  })),

                html.tag('ul', sampledTracks.map(getTrackItem)),
              ]),

            ...html.fragment(
              !empty(sampledByTracks) && [
                html.tag('p', {class: ['content-heading']},
                  language.$('releaseInfo.tracksThatSample', {
                    track: html.tag('i', track.name),
                  })),

                html.tag('ul', sampledByTracks.map(getTrackItem)),
              ]),

            ...html.fragment(
              wikiInfo.enableFlashesAndGames &&
              !empty(flashesThatFeature) && [
                html.tag('p', {class: ['content-heading']},
                  language.$('releaseInfo.flashesThatFeature', {
                    track: html.tag('i', track.name),
                  })),

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
                html.tag('p', {class: ['content-heading']},
                  language.$('releaseInfo.lyrics')),

                html.tag('blockquote', transformLyrics(track.lyrics)),
              ]),

            ...html.fragment(
              hasCommentary && [
                html.tag('p', {class: ['content-heading']},
                  language.$('releaseInfo.artistCommentary')),

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
