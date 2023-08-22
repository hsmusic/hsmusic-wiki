import {empty} from '#sugar';
import {sortAlbumsTracksChronologically, sortFlashesChronologically} from '#wiki-data';

import getChronologyRelations from '../util/getChronologyRelations.js';

export default {
  contentDependencies: [
    'generateAdditionalFilesShortcut',
    'generateAlbumAdditionalFilesList',
    'generateAlbumNavAccent',
    'generateAlbumSidebar',
    'generateAlbumStyleRules',
    'generateChronologyLinks',
    'generateContentHeading',
    'generateContributionList',
    'generatePageLayout',
    'generateTrackCoverArtwork',
    'generateTrackList',
    'generateTrackListDividedByGroups',
    'generateTrackReleaseInfo',
    'generateTrackSocialEmbed',
    'linkAlbum',
    'linkArtist',
    'linkFlash',
    'linkTrack',
    'transformContent',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({wikiInfo}) {
    return {
      divideTrackListsByGroups: wikiInfo.divideTrackListsByGroups,
      enableFlashesAndGames: wikiInfo.enableFlashesAndGames,
    };
  },

  relations(relation, sprawl, track) {
    const relations = {};
    const sections = relations.sections = {};
    const {album} = track;

    relations.layout =
      relation('generatePageLayout');

    relations.albumStyleRules =
      relation('generateAlbumStyleRules', track.album);

    relations.socialEmbed =
      relation('generateTrackSocialEmbed', track);

    relations.artistChronologyContributions =
      getChronologyRelations(track, {
        contributions: [
          ...track.artistContribs ?? [],
          ...track.contributorContribs ?? [],
        ],

        linkArtist: artist => relation('linkArtist', artist),
        linkThing: track => relation('linkTrack', track),

        getThings: artist =>
          sortAlbumsTracksChronologically([
            ...artist.tracksAsArtist,
            ...artist.tracksAsContributor,
          ]),
      });

    relations.coverArtistChronologyContributions =
      getChronologyRelations(track, {
        contributions: track.coverArtistContribs ?? [],

        linkArtist: artist => relation('linkArtist', artist),

        linkThing: trackOrAlbum =>
          (trackOrAlbum.album
            ? relation('linkTrack', trackOrAlbum)
            : relation('linkAlbum', trackOrAlbum)),

        getThings: artist =>
          sortAlbumsTracksChronologically([
            ...artist.albumsAsCoverArtist,
            ...artist.tracksAsCoverArtist,
          ], {
            getDate: albumOrTrack => albumOrTrack.coverArtDate,
          }),
      }),

    relations.albumLink =
      relation('linkAlbum', track.album);

    relations.trackLink =
      relation('linkTrack', track);

    relations.albumNavAccent =
      relation('generateAlbumNavAccent', track.album, track);

    relations.chronologyLinks =
      relation('generateChronologyLinks');

    relations.sidebar =
      relation('generateAlbumSidebar', track.album, track);

    const additionalFilesSection = additionalFiles => ({
      heading: relation('generateContentHeading'),
      list: relation('generateAlbumAdditionalFilesList', album, additionalFiles),
    });

    if (track.hasUniqueCoverArt || album.hasCoverArt) {
      relations.cover =
        relation('generateTrackCoverArtwork', track);
    }

    // Section: Release info

    relations.releaseInfo =
      relation('generateTrackReleaseInfo', track);

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

      contributors.list =
        relation('generateContributionList', track.contributorContribs);
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
        sortFlashesChronologically(
          [track, ...track.otherReleases].flatMap(track =>
            track.featuredInFlashes.map(flash => ({
              // These aren't going to be exposed directly, they're processed
              // into the appropriate relations after this sort.
              flash, track,

              // These properties are only used for the sort.
              act: flash.act,
              date: flash.date,
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
    return {
      name: track.name,
      color: track.color,

      hasTrackNumbers: track.album.hasTrackNumbers,
      trackNumber: track.album.tracks.indexOf(track) + 1,

      numAdditionalFiles: track.additionalFiles.length,
    };
  },

  generate(data, relations, {html, language}) {
    const {sections: sec} = relations;

    return relations.layout
      .slots({
        title: language.$('trackPage.title', {track: data.name}),
        headingMode: 'sticky',

        color: data.color,
        styleRules: [relations.albumStyleRules],

        cover:
          (relations.cover
            ? relations.cover.slots({
                alt: language.$('misc.alt.trackCover'),
              })
            : null),

        mainContent: [
          relations.releaseInfo,

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

            sec.contributors.list,
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
        ],

        navLinkStyle: 'hierarchical',
        navLinks: [
          {auto: 'home'},
          {html: relations.albumLink.slot('color', false)},
          {
            html:
              (data.hasTrackNumbers
                ? language.$('trackPage.nav.track.withNumber', {
                    number: data.trackNumber,
                    track: relations.trackLink
                      .slot('attributes', {class: 'current'}),
                  })
                : language.$('trackPage.nav.track', {
                    track: relations.trackLink
                      .slot('attributes', {class: 'current'}),
                  })),
          },
        ],

        navBottomRowContent:
          relations.albumNavAccent.slots({
            showTrackNavigation: true,
            showExtraLinks: false,
          }),

        navContent:
          relations.chronologyLinks.slots({
            chronologyInfoSets: [
              {
                headingString: 'misc.chronology.heading.track',
                contributions: relations.artistChronologyContributions,
              },
              {
                headingString: 'misc.chronology.heading.coverArt',
                contributions: relations.coverArtistChronologyContributions,
              },
            ],
          }),

        ...relations.sidebar,

        socialEmbed: relations.socialEmbed,
      });
  },
};

/*
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

  const page = {
    page: () => {
      return {
        theme:
          getThemeString(track.color, {
            additionalVariables: [
              `--album-directory: ${album.directory}`,
              `--track-directory: ${track.directory}`,
            ]
          }),
      };
    },
  };
*/
