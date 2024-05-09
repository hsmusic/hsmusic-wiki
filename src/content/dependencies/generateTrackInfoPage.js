import {sortAlbumsTracksChronologically, sortFlashesChronologically}
  from '#sort';
import {empty, stitchArrays} from '#sugar';

import getChronologyRelations from '../util/getChronologyRelations.js';

export default {
  contentDependencies: [
    'generateAbsoluteDatetimestamp',
    'generateAdditionalFilesShortcut',
    'generateAlbumAdditionalFilesList',
    'generateAlbumNavAccent',
    'generateAlbumSecondaryNav',
    'generateAlbumSidebar',
    'generateAlbumStyleRules',
    'generateChronologyLinks',
    'generateColorStyleAttribute',
    'generateCommentarySection',
    'generateContentHeading',
    'generateContributionList',
    'generatePageLayout',
    'generateRelativeDatetimestamp',
    'generateReviewPointsSection',
    'generateTrackAdditionalNamesBox',
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
      relation('generateAlbumStyleRules', track.album, track);

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

        getThings(artist) {
          const getDate = thing => thing.date;

          const things = [
            ...artist.tracksAsArtist,
            ...artist.tracksAsContributor,
          ].filter(getDate);

          return sortAlbumsTracksChronologically(things, {getDate});
        },
      });

    relations.coverArtistChronologyContributions =
      getChronologyRelations(track, {
        contributions: track.coverArtistContribs ?? [],

        linkArtist: artist => relation('linkArtist', artist),

        linkThing: trackOrAlbum =>
          (trackOrAlbum.album
            ? relation('linkTrack', trackOrAlbum)
            : relation('linkAlbum', trackOrAlbum)),

        getThings(artist) {
          const getDate = thing => thing.coverArtDate ?? thing.date;

          const things = [
            ...artist.albumsAsCoverArtist,
            ...artist.tracksAsCoverArtist,
          ].filter(getDate);

          return sortAlbumsTracksChronologically(things, {getDate});
        },
      }),

    relations.albumLink =
      relation('linkAlbum', track.album);

    relations.trackLink =
      relation('linkTrack', track);

    relations.albumNavAccent =
      relation('generateAlbumNavAccent', track.album, track);

    relations.chronologyLinks =
      relation('generateChronologyLinks');

    relations.secondaryNav =
      relation('generateAlbumSecondaryNav', track.album);

    relations.sidebar =
      relation('generateAlbumSidebar', track.album, track);

    const additionalFilesSection = additionalFiles => ({
      heading: relation('generateContentHeading'),
      list: relation('generateAlbumAdditionalFilesList', album, additionalFiles),
    });

    // This'll take care of itself being blank if there's nothing to show here.
    relations.additionalNamesBox =
      relation('generateTrackAdditionalNamesBox', track);

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

      otherReleases.colorStyles =
        track.otherReleases
          .map(track => relation('generateColorStyleAttribute', track.color));

      otherReleases.trackLinks =
        track.otherReleases
          .map(track => relation('linkTrack', track));

      otherReleases.albumLinks =
        track.otherReleases
          .map(track => relation('linkAlbum', track.album));

      otherReleases.datetimestamps =
        track.otherReleases.map(track2 =>
          (track2.date
            ? (track.date
                ? relation('generateRelativeDatetimestamp',
                    track2.date,
                    track.date)
                : relation('generateAbsoluteDatetimestamp',
                    track2.date))
            : null));

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

    // Section: Sampled tracks

    if (!empty(track.sampledTracks)) {
      const samples = sections.samples = {};

      samples.heading =
        relation('generateContentHeading');

      samples.list =
        relation('generateTrackList', track.sampledTracks);
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
      sections.artistCommentary =
        relation('generateCommentarySection', track.commentary);
    }

    // Section: Review points

    if (!empty(track.reviewPoints)) {
      sections.reviewPoints =
        relation('generateReviewPointsSection', track.reviewPoints);
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

        additionalNames: relations.additionalNamesBox,

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
            {[html.onlyIfContent]: true},
            {[html.joinChildren]: html.tag('br')},

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

              sec.reviewPoints &&
                language.$('releaseInfo.readReviewPoints', {
                  link: html.tag('a',
                    {href: '#review-points'},
                    language.$('releaseInfo.readReviewPoints.link')),
                }),
            ]),

          sec.otherReleases && [
            sec.otherReleases.heading
              .slots({
                id: 'also-released-as',
                title: language.$('releaseInfo.alsoReleasedAs'),
              }),

            html.tag('ul',
              stitchArrays({
                trackLink: sec.otherReleases.trackLinks,
                albumLink: sec.otherReleases.albumLinks,
                datetimestamp: sec.otherReleases.datetimestamps,
                colorStyle: sec.otherReleases.colorStyles,
              }).map(({
                  trackLink,
                  albumLink,
                  datetimestamp,
                  colorStyle,
                }) => {
                  const parts = ['releaseInfo.alsoReleasedAs.item'];
                  const options = {};

                  options.track = trackLink.slot('color', false);
                  options.album = albumLink;

                  if (datetimestamp) {
                    parts.push('withYear');
                    options.year =
                      datetimestamp.slots({
                        style: 'year',
                        tooltip: true,
                      });
                  }

                  return (
                    html.tag('li',
                      colorStyle,
                      language.$(...parts, options)));
                })),
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

          sec.artistCommentary,

          sec.reviewPoints,
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

        secondaryNav:
          relations.secondaryNav
            .slot('mode', 'track'),

        leftSidebar: relations.sidebar,

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
