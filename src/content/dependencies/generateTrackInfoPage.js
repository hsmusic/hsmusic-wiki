import {empty} from '#sugar';

export default {
  contentDependencies: [
    'generateAlbumAdditionalFilesList',
    'generateAlbumNavAccent',
    'generateAlbumSecondaryNav',
    'generateAlbumSidebar',
    'generateAlbumStyleRules',
    'generateCommentarySection',
    'generateContentHeading',
    'generateContributionList',
    'generatePageLayout',
    'generateTrackAdditionalNamesBox',
    'generateTrackChronologyLinks',
    'generateTrackCoverArtwork',
    'generateTrackInfoPageFeaturedByFlashesList',
    'generateTrackInfoPageOtherReleasesList',
    'generateTrackList',
    'generateTrackListDividedByGroups',
    'generateTrackReleaseInfo',
    'generateTrackSocialEmbed',
    'linkAlbum',
    'linkTrack',
    'transformContent',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({wikiInfo}) => ({
    divideTrackListsByGroups:
      wikiInfo.divideTrackListsByGroups,
  }),

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

    relations.albumLink =
      relation('linkAlbum', track.album);

    relations.trackLink =
      relation('linkTrack', track);

    relations.albumNavAccent =
      relation('generateAlbumNavAccent', track.album, track);

    relations.trackChronologyLinks =
      relation('generateTrackChronologyLinks', track);

    relations.secondaryNav =
      relation('generateAlbumSecondaryNav', track.album);

    relations.sidebar =
      relation('generateAlbumSidebar', track.album, track);

    // This'll take care of itself being blank if there's nothing to show here.
    relations.additionalNamesBox =
      relation('generateTrackAdditionalNamesBox', track);

    if (track.hasUniqueCoverArt || album.hasCoverArt) {
      relations.cover =
        relation('generateTrackCoverArtwork', track);
    }

    relations.contentHeading =
      relation('generateContentHeading');

    // Section: Release info

    relations.releaseInfo =
      relation('generateTrackReleaseInfo', track);

    // Section: Other releases

    relations.otherReleasesList =
        relation('generateTrackInfoPageOtherReleasesList', track);

    // Section: Contributors

    relations.contributorContributionList =
      relation('generateContributionList', track.contributorContribs);

    relations.referencedTracksList =
      relation('generateTrackList', track.referencedTracks);

    // Section: Sampled tracks

    relations.sampledTracksList =
      relation('generateTrackList', track.sampledTracks);

    // Section: Tracks that reference

    relations.referencedByTracksList =
      relation('generateTrackListDividedByGroups',
        track.referencedByTracks,
        sprawl.divideTrackListsByGroups);

    // Section: Tracks that sample

    relations.sampledByTracksList =
      relation('generateTrackListDividedByGroups',
        track.sampledByTracks,
        sprawl.divideTrackListsByGroups);

    // Section: Flashes that feature

    relations.flashesThatFeatureList =
      relation('generateTrackInfoPageFeaturedByFlashesList', track);

    // Section: Lyrics

    relations.lyrics =
      relation('transformContent', track.lyrics);

    // Sections: Sheet music files, MIDI/proejct files, additional files

    relations.sheetMusicFilesList =
      relation('generateAlbumAdditionalFilesList',
        album,
        track.sheetMusicFiles);

    relations.midiProjectFilesList =
      relation('generateAlbumAdditionalFilesList',
        album,
        track.midiProjectFiles);

    relations.additionalFilesList =
      relation('generateAlbumAdditionalFilesList',
        album,
        track.additionalFiles);

    // Section: Artist commentary

    relations.artistCommentarySection =
      relation('generateCommentarySection', track.commentary);

    return relations;
  },

  data(sprawl, track) {
    return {
      name: track.name,
      color: track.color,

      hasTrackNumbers: track.album.hasTrackNumbers,
      trackNumber: track.album.tracks.indexOf(track) + 1,
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
              !html.isBlank(relations.sheetMusicFilesList) &&
                language.$('releaseInfo.sheetMusicFiles.shortcut', {
                  link: html.tag('a',
                    {href: '#sheet-music-files'},
                    language.$('releaseInfo.sheetMusicFiles.shortcut.link')),
                }),

              !html.isBlank(relations.midiProjectFilesList) &&
                language.$('releaseInfo.midiProjectFiles.shortcut', {
                  link: html.tag('a',
                    {href: '#midi-project-files'},
                    language.$('releaseInfo.midiProjectFiles.shortcut.link')),
                }),

              !html.isBlank(relations.additionalFilesList) &&
                language.$('releaseInfo.additionalFiles.shortcut', {
                  link: html.tag('a',
                    {href: '#midi-project-files'},
                    language.$('releaseInfo.additionalFiles.shortcut.link')),
                }),

              !html.isBlank(relations.artistCommentarySection) &&
                language.$('releaseInfo.readCommentary', {
                  link: html.tag('a',
                    {href: '#artist-commentary'},
                    language.$('releaseInfo.readCommentary.link')),
                }),
            ]),

          html.tags([
            relations.contentHeading.clone()
              .slots({
                attributes: {id: 'also-released-as'},
                title: language.$('releaseInfo.alsoReleasedAs'),
              }),

            relations.otherReleasesList,
          ]),

          html.tags([
            relations.contentHeading.clone()
              .slots({
                attributes: {id: 'contributors'},
                title: language.$('releaseInfo.contributors'),
              }),

            relations.contributorContributionList,
          ]),

          html.tags([
            relations.contentHeading.clone()
              .slots({
                attributes: {id: 'references'},

                title:
                  language.$('releaseInfo.tracksReferenced', {
                    track: html.tag('i', data.name),
                  }),

                stickyTitle:
                  language.$('releaseInfo.tracksReferenced.sticky'),
              }),

            relations.referencedTracksList,
          ]),

          html.tags([
            relations.contentHeading.clone()
              .slots({
                attributes: {id: 'samples'},

                title:
                  language.$('releaseInfo.tracksSampled', {
                    track: html.tag('i', data.name),
                  }),

                stickyTitle:
                  language.$('releaseInfo.tracksSampled.sticky'),
              }),

            relations.sampledTracksList,
          ]),

          html.tags([
            relations.contentHeading.clone()
              .slots({
                attributes: {id: 'referenced-by'},

                title:
                  language.$('releaseInfo.tracksThatReference', {
                    track: html.tag('i', data.name),
                  }),

                stickyTitle:
                  language.$('releaseInfo.tracksThatReference.sticky'),
              }),

            relations.referencedByTracksList
              .slots({
                headingString: 'releaseInfo.tracksThatReference',
              }),
          ]),

          html.tags([
            relations.contentHeading.clone()
              .slots({
                attributes: {id: 'sampled-by'},

                title:
                  language.$('releaseInfo.tracksThatSample', {
                    track: html.tag('i', data.name),
                  }),

                stickyTitle:
                  language.$('releaseInfo.tracksThatSample.sticky'),
              }),

            relations.sampledByTracksList
              .slots({
                headingString: 'releaseInfo.tracksThatSample',
              }),
          ]),

          html.tags([
            relations.contentHeading.clone()
              .slots({
                attributes: {id: 'featured-in'},

                title:
                  language.$('releaseInfo.flashesThatFeature', {
                    track: html.tag('i', data.name),
                  }),

                stickyTitle:
                  language.$('releaseInfo.flashesThatFeature.sticky'),
              }),

            relations.flashesThatFeatureList,
          ]),

          html.tags([
            relations.contentHeading.clone()
              .slots({
                attributes: {id: 'lyrics'},
                title: language.$('releaseInfo.lyrics'),
              }),

            html.tag('blockquote',
              {[html.onlyIfContent]: true},
              relations.lyrics.slot('mode', 'lyrics')),
          ]),

          html.tags([
            relations.contentHeading.clone()
              .slots({
                attributes: {id: 'sheet-music-files'},
                title: language.$('releaseInfo.sheetMusicFiles.heading'),
              }),

            relations.sheetMusicFilesList,
          ]),

          html.tags([
            relations.contentHeading.clone()
              .slots({
                attributes: {id: 'midi-project-files'},
                title: language.$('releaseInfo.midiProjectFiles.heading'),
              }),

            relations.midiProjectFilesList,
          ]),

          html.tags([
            relations.contentHeading.clone()
              .slots({
                attributes: {id: 'additional-files'},
                title: language.$('releaseInfo.additionalFiles.heading'),
              }),

            relations.additionalFilesList,
          ]),

          relations.artistCommentarySection,
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
          relations.trackChronologyLinks,

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
