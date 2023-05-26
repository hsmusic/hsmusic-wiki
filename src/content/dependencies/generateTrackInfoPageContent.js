import {empty} from '../../util/sugar.js';
import {sortChronologically} from '../../util/wiki-data.js';

export default {
  contentDependencies: [
    'generateAdditionalFilesShortcut',
    'generateAlbumAdditionalFilesList',
    'generateContentHeading',
    'generateCoverArtwork',
    'generateTrackList',
    'generateTrackListDividedByGroups',
    'linkAlbum',
    'linkContribution',
    'linkExternal',
    'linkTrack',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({wikiInfo}) {
    return {
      divideTrackListsByGroups: wikiInfo.divideTrackListsByGroups,
      enableFlashesAndGames: wikiInfo.enableFlashesAndGames,
    };
  },

  relations(relation, sprawl, track) {
    const {album} = track;

    const relations = {};
    const sections = relations.sections = {};

    const contributionLinksRelation = contribs =>
      contribs.map(contrib =>
        relation('linkContribution', contrib.who, contrib.what));

    const additionalFilesSection = additionalFiles => ({
      heading: relation('generateContentHeading'),
      list: relation('generateAlbumAdditionalFilesList', album, additionalFiles),
    });

    // Section: Release info

    const releaseInfo = sections.releaseInfo = {};

    releaseInfo.artistContributionLinks =
      contributionLinksRelation(track.artistContribs);

    if (track.hasUniqueCoverArt) {
      relations.cover =
        relation('generateCoverArtwork', track.artTags);
      releaseInfo.coverArtistContributionLinks =
        contributionLinksRelation(track.coverArtistContribs);
    } else if (album.hasCoverArt) {
      relations.cover =
        relation('generateCoverArtwork', album.artTags);
    } else {
      relations.cover = null;
    }

    // Section: Listen on

    const listen = sections.listen = {};

    if (!empty(track.urls)) {
      listen.externalLinks =
        track.urls.map(url =>
          relation('linkExternal', url));
    }

    // Section: Extra links

    const extra = sections.extra = {};

    if (!empty(track.additionalFiles)) {
      extra.additionalFilesShortcut =
        relation('generateAdditionalFilesShortcut', track.additionalFiles);
    }

    // Section: Other releases

    if (!empty(track.otherReleases)) {
      const otherReleases = sections.otherReleases = {};

      otherReleases.heading =
        relation('generateContentHeading');

      otherReleases.items =
        track.otherReleases.map(track => ({
          trackLink: relation('linkTrack', track),
          albumLink: relation('linkAlbum', track.album),
        }));
    }

    // Section: Contributors

    if (!empty(track.contributorContribs)) {
      const contributors = sections.contributors = {};

      contributors.heading =
        relation('generateContentHeading');

      contributors.contributionLinks =
        contributionLinksRelation(track.contributorContribs);
    }

    // Section: Referenced tracks

    if (!empty(track.referencedTracks)) {
      const references = sections.references = {};

      references.heading =
        relation('generateContentHeading');

      references.list =
        relation('generateTrackList', track.referencedTracks);
    }

    // Section: Tracks that reference

    if (!empty(track.referencedByTracks)) {
      const referencedBy = sections.referencedBy = {};

      referencedBy.heading =
        relation('generateContentHeading');

      referencedBy.list =
        relation('generateTrackListDividedByGroups',
          track.referencedByTracks,
          sprawl.divideTrackListsByGroups);
    }

    // Section: Sampled tracks

    if (!empty(track.sampledTracks)) {
      const samples = sections.samples = {};

      samples.heading =
        relation('generateContentHeading');

      samples.list =
        relation('generateTrackList', track.sampledTracks);
    }

    // Section: Tracks that sample

    if (!empty(track.sampledByTracks)) {
      const sampledBy = sections.sampledBy = {};

      sampledBy.heading =
        relation('generateContentHeading');

      sampledBy.list =
        relation('generateTrackListDividedByGroups',
          track.sampledByTracks,
          sprawl.divideTrackListsByGroups);
    }

    // Section: Flashes that feature

    if (sprawl.enableFlashesAndGames) {
      const sortedFeatures =
        sortChronologically(
          [track, ...track.otherReleases].flatMap(track =>
            track.featuredInFlashes.map(flash => ({
              // These aren't going to be exposed directly, they're processed
              // into the appropriate relations after this sort.
              flash, track,

              // These properties are only used for the sort.
              date: flash.date,
              name: flash.name,
              directory: flash.directory,
            }))));

      if (!empty(sortedFeatures)) {
        const flashesThatFeature = sections.flashesThatFeature = {};

        flashesThatFeature.heading =
          relation('generateContentHeading');

        flashesThatFeature.entries =
          sortedFeatures.map(({flash, track: directlyFeaturedTrack}) =>
            (directlyFeaturedTrack === track
              ? {
                  flashLink: relation('linkFlash', flash),
                }
              : {
                  flashLink: relation('linkFlash', flash),
                  trackLink: relation('linkTrack', directlyFeaturedTrack),
                }));
      }
    }

    // Section: Lyrics

    if (track.lyrics) {
      const lyrics = sections.lyrics = {};

      lyrics.heading =
        relation('generateContentHeading');

      lyrics.content =
        relation('transformContent', track.lyrics);
    }

    // Sections: Sheet music files, MIDI/proejct files, additional files

    if (!empty(track.sheetMusicFiles)) {
      sections.sheetMusicFiles = additionalFilesSection(track.sheetMusicFiles);
    }

    if (!empty(track.midiProjectFiles)) {
      sections.midiProjectFiles = additionalFilesSection(track.midiProjectFiles);
    }

    if (!empty(track.additionalFiles)) {
      sections.additionalFiles = additionalFilesSection(track.additionalFiles);
    }

    // Section: Artist commentary

    if (track.commentary) {
      const artistCommentary = sections.artistCommentary = {};

      artistCommentary.heading =
        relation('generateContentHeading');

      artistCommentary.content =
        relation('transformContent', track.commentary);
    }

    return relations;
  },

  data(sprawl, track) {
    const data = {};

    const {album} = track;

    data.name = track.name;
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

    if (!empty(track.additionalFiles)) {
      data.numAdditionalFiles = track.additionalFiles.length;
    }

    return data;
  },

  generate(data, relations, {html, language}) {
    const content = {};

    const {sections: sec} = relations;

    const formatContributions =
      (stringKey, contributionLinks, {showContribution = true, showIcons = true} = {}) =>
        contributionLinks &&
          language.$(stringKey, {
            artists:
              language.formatConjunctionList(
                contributionLinks.map(link =>
                  link.slots({showContribution, showIcons}))),
          });

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
          formatContributions('releaseInfo.by', sec.releaseInfo.artistContributionLinks),
          formatContributions('releaseInfo.coverArtBy', sec.releaseInfo.coverArtistContributionLinks),

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

        html.tag('p',
          (sec.listen.externalLinks
            ? language.$('releaseInfo.listenOn', {
                links: language.formatDisjunctionList(sec.listen.externalLinks),
              })
            : language.$('releaseInfo.listenOn.noLinks', {
                name: html.tag('i', data.name),
              }))),

        html.tag('p',
          {
            [html.onlyIfContent]: true,
            [html.joinChildren]: '<br>',
          },
          [
            sec.sheetMusicFiles &&
              language.$('releaseInfo.sheetMusicFiles.shortcut', {
                link: html.tag('a',
                  {href: '#sheet-music-files'},
                  language.$('releaseInfo.sheetMusicFiles.shortcut.link')),
              }),

            sec.midiProjectFiles &&
              language.$('releaseInfo.midiProjectFiles.shortcut', {
                link: html.tag('a',
                  {href: '#midi-project-files'},
                  language.$('releaseInfo.midiProjectFiles.shortcut.link')),
              }),

            sec.additionalFiles &&
              sec.extra.additionalFilesShortcut,

            sec.artistCommentary &&
              language.$('releaseInfo.readCommentary', {
                link: html.tag('a',
                  {href: '#artist-commentary'},
                  language.$('releaseInfo.readCommentary.link')),
              }),
          ]),

        sec.otherReleases && [
          sec.otherReleases.heading
            .slots({
              id: 'also-released-as',
              title: language.$('releaseInfo.alsoReleasedAs'),
            }),

          html.tag('ul',
            sec.otherReleases.items.map(({trackLink, albumLink}) =>
              html.tag('li',
                language.$('releaseInfo.alsoReleasedAs.item', {
                  track: trackLink,
                  album: albumLink,
                })))),
        ],

        sec.contributors && [
          sec.contributors.heading
            .slots({
              id: 'contributors',
              title: language.$('releaseInfo.contributors'),
            }),

          html.tag('ul', sec.contributors.contributionLinks.map(contributionLink =>
            html.tag('li',
              contributionLink
                .slots({
                  showIcons: true,
                  showContribution: true,
                })))),
        ],

        sec.references && [
          sec.references.heading
            .slots({
              id: 'references',
              title:
                language.$('releaseInfo.tracksReferenced', {
                  track: html.tag('i', data.name),
                }),
            }),

          sec.references.list,
        ],

        sec.referencedBy && [
          sec.referencedBy.heading
            .slots({
              id: 'referenced-by',
              title:
                language.$('releaseInfo.tracksThatReference', {
                  track: html.tag('i', data.name),
                }),
            }),

          sec.referencedBy.list,
        ],

        sec.samples && [
          sec.samples.heading
            .slots({
              id: 'samples',
              title:
                language.$('releaseInfo.tracksSampled', {
                  track: html.tag('i', data.name),
                }),
            }),

          sec.samples.list,
        ],

        sec.sampledBy && [
          sec.sampledBy.heading
            .slots({
              id: 'referenced-by',
              title:
                language.$('releaseInfo.tracksThatSample', {
                  track: html.tag('i', data.name),
                }),
            }),

          sec.sampledBy.list,
        ],
        sec.flashesThatFeature && [
          sec.flashesThatFeature.heading
            .slots({
              id: 'featured-in',
              title:
                language.$('releaseInfo.flashesThatFeature', {
                  track: html.tag('i', data.name),
                }),
            }),

          html.tag('ul', sec.flashesThatFeature.entries.map(({flashLink, trackLink}) =>
            (trackLink
              ? html.tag('li', {class: 'rerelease'},
                  language.$('releaseInfo.flashesThatFeature.item.asDifferentRelease', {
                    flash: flashLink,
                    track: trackLink,
                  }))
              : html.tag('li',
                  language.$('releaseInfo.flashesThatFeature.item', {
                    flash: flashLink,
                  }))))),
        ],

        sec.lyrics && [
          sec.lyrics.heading
            .slots({
              id: 'lyrics',
              title: language.$('releaseInfo.lyrics'),
            }),

          html.tag('blockquote',
            sec.lyrics.content
              .slot('mode', 'lyrics')),
        ],

        sec.sheetMusicFiles && [
          sec.sheetMusicFiles.heading
            .slots({
              id: 'sheet-music-files',
              title: language.$('releaseInfo.sheetMusicFiles.heading'),
            }),

          sec.sheetMusicFiles.list,
        ],

        sec.midiProjectFiles && [
          sec.midiProjectFiles.heading
            .slots({
              id: 'midi-project-files',
              title: language.$('releaseInfo.midiProjectFiles.heading'),
            }),

          sec.midiProjectFiles.list,
        ],

        sec.additionalFiles && [
          sec.additionalFiles.heading
            .slots({
              id: 'additional-files',
              title:
                language.$('releaseInfo.additionalFiles.heading', {
                  additionalFiles:
                    language.countAdditionalFiles(data.numAdditionalFiles, {unit: true}),
                }),
            }),

          sec.additionalFiles.list,
        ],

        sec.artistCommentary && [
          sec.artistCommentary.heading
            .slots({
              id: 'artist-commentary',
              title: language.$('releaseInfo.artistCommentary')
            }),

          html.tag('blockquote',
            sec.artistCommentary.content
              .slot('mode', 'multiline')),
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
