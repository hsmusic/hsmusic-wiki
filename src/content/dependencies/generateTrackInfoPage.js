export default {
  contentDependencies: [
    'generateAdditionalNamesBox',
    'generateAlbumAdditionalFilesList',
    'generateAlbumNavAccent',
    'generateAlbumSecondaryNav',
    'generateAlbumSidebar',
    'generateAlbumStyleRules',
    'generateCommentaryEntry',
    'generateContentHeading',
    'generateContributionList',
    'generatePageLayout',
    'generateTrackCoverArtwork',
    'generateTrackInfoPageFeaturedByFlashesList',
    'generateTrackInfoPageOtherReleasesList',
    'generateTrackList',
    'generateTrackListDividedByGroups',
    'generateTrackNavLinks',
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

  query: (_sprawl, track) => ({
    originalReleaseTrack:
      (track.isOriginalRelease
        ? track
        : track.originalReleaseTrack),
  }),

  relations: (relation, query, sprawl, track) => ({
    layout:
      relation('generatePageLayout'),

    albumStyleRules:
      relation('generateAlbumStyleRules', track.album, track),

    socialEmbed:
      relation('generateTrackSocialEmbed', track),

    navLinks:
      relation('generateTrackNavLinks', track),

    albumNavAccent:
      relation('generateAlbumNavAccent', track.album, track),

    secondaryNav:
      relation('generateAlbumSecondaryNav', track.album),

    sidebar:
      relation('generateAlbumSidebar', track.album, track),

    additionalNamesBox:
      relation('generateAdditionalNamesBox', track.additionalNames),

    cover:
      (track.hasUniqueCoverArt || track.album.hasCoverArt
        ? relation('generateTrackCoverArtwork', track)
        : null),

    contentHeading:
      relation('generateContentHeading'),

    releaseInfo:
      relation('generateTrackReleaseInfo', track),

    otherReleasesList:
      relation('generateTrackInfoPageOtherReleasesList', track),

    contributorContributionList:
      relation('generateContributionList', track.contributorContribs),

    referencedTracksList:
      relation('generateTrackList', track.referencedTracks),

    sampledTracksList:
      relation('generateTrackList', track.sampledTracks),

    referencedByTracksList:
      relation('generateTrackListDividedByGroups',
        query.originalReleaseTrack.referencedByTracks,
        sprawl.divideTrackListsByGroups),

    sampledByTracksList:
      relation('generateTrackListDividedByGroups',
        query.originalReleaseTrack.sampledByTracks,
        sprawl.divideTrackListsByGroups),

    flashesThatFeatureList:
      relation('generateTrackInfoPageFeaturedByFlashesList', track),

    lyrics:
      relation('transformContent', track.lyrics),

    sheetMusicFilesList:
      relation('generateAlbumAdditionalFilesList',
        track.album,
        track.sheetMusicFiles),

    midiProjectFilesList:
      relation('generateAlbumAdditionalFilesList',
        track.album,
        track.midiProjectFiles),

    additionalFilesList:
      relation('generateAlbumAdditionalFilesList',
        track.album,
        track.additionalFiles),

    artistCommentaryEntries:
      track.commentary
        .map(entry => relation('generateCommentaryEntry', entry)),

    creditSourceEntries:
      track.creditSources
        .map(entry => relation('generateCommentaryEntry', entry)),
  }),

  data: (_query, _sprawl, track) => ({
    name:
      track.name,

    color:
      track.color,
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('trackPage', pageCapsule =>
      relations.layout.slots({
        title:
          language.$(pageCapsule, 'title', {
            track: data.name,
          }),

        headingMode: 'sticky',

        additionalNames: relations.additionalNamesBox,

        color: data.color,
        styleRules: [relations.albumStyleRules],

        cover:
          (relations.cover
            ? relations.cover.slots({
                showReferenceLinks: true,
                showNonUniqueLine: true,
              })
            : null),

        mainContent: [
          relations.releaseInfo,

          html.tag('p',
            {[html.onlyIfContent]: true},
            {[html.joinChildren]: html.tag('br')},

            language.encapsulate('releaseInfo', capsule => [
              !html.isBlank(relations.sheetMusicFilesList) &&
                language.encapsulate(capsule, 'sheetMusicFiles.shortcut', capsule =>
                  language.$(capsule, {
                    link:
                      html.tag('a',
                        {href: '#sheet-music-files'},
                        language.$(capsule, 'link')),
                  })),

              !html.isBlank(relations.midiProjectFilesList) &&
                language.encapsulate(capsule, 'midiProjectFiles.shortcut', capsule =>
                  language.$(capsule, {
                    link:
                      html.tag('a',
                        {href: '#midi-project-files'},
                        language.$(capsule, 'link')),
                  })),

              !html.isBlank(relations.additionalFilesList) &&
                language.encapsulate(capsule, 'additionalFiles.shortcut', capsule =>
                  language.$(capsule, {
                    link:
                      html.tag('a',
                        {href: '#midi-project-files'},
                        language.$(capsule, 'link')),
                  })),

              !html.isBlank(relations.artistCommentaryEntries) &&
                language.encapsulate(capsule, 'readCommentary', capsule =>
                  language.$(capsule, {
                    link:
                      html.tag('a',
                        {href: '#artist-commentary'},
                        language.$(capsule, 'link')),
                  })),

              !html.isBlank(relations.creditSourceEntries) &&
                language.encapsulate(capsule, 'readCreditSources', capsule =>
                  language.$(capsule, {
                    link:
                      html.tag('a',
                        {href: '#credit-sources'},
                        language.$(capsule, 'link')),
                  })),
            ])),

          relations.otherReleasesList,

          html.tags([
            relations.contentHeading.clone()
              .slots({
                attributes: {id: 'contributors'},
                title: language.$('releaseInfo.contributors'),
              }),

            relations.contributorContributionList.slots({
              chronologyKind: 'trackContribution',
            }),
          ]),

          html.tags([
            language.encapsulate('releaseInfo.tracksReferenced', capsule =>
              relations.contentHeading.clone()
                .slots({
                  attributes: {id: 'references'},

                  title:
                    language.$(capsule, {
                      track:
                        html.tag('i', data.name),
                    }),

                  stickyTitle:
                    language.$(capsule, 'sticky'),
                })),

            relations.referencedTracksList,
          ]),

          html.tags([
            language.encapsulate('releaseInfo.tracksSampled', capsule =>
              relations.contentHeading.clone()
                .slots({
                  attributes: {id: 'samples'},

                  title:
                    language.$(capsule, {
                      track:
                        html.tag('i', data.name),
                    }),

                  stickyTitle:
                    language.$(capsule, 'sticky'),
                })),

            relations.sampledTracksList,
          ]),

          language.encapsulate('releaseInfo.tracksThatReference', capsule =>
            html.tags([
              relations.contentHeading.clone()
                .slots({
                  attributes: {id: 'referenced-by'},

                  title:
                    language.$(capsule, {
                      track: html.tag('i', data.name),
                    }),

                  stickyTitle:
                    language.$(capsule, 'sticky'),
                }),

              relations.referencedByTracksList
                .slots({
                  headingString: capsule,
                }),
            ])),

          language.encapsulate('releaseInfo.tracksThatSample', capsule =>
            html.tags([
              relations.contentHeading.clone()
                .slots({
                  attributes: {id: 'sampled-by'},

                  title:
                    language.$(capsule, {
                      track: html.tag('i', data.name),
                    }),

                  stickyTitle:
                    language.$(capsule, 'sticky'),
                }),

              relations.sampledByTracksList
                .slots({
                  headingString: capsule,
                }),
            ])),

          html.tags([
            language.encapsulate('releaseInfo.flashesThatFeature', capsule =>
              relations.contentHeading.clone()
                .slots({
                  attributes: {id: 'featured-in'},

                  title:
                    language.$(capsule, {
                      track: html.tag('i', data.name),
                    }),

                  stickyTitle:
                    language.$(capsule, 'sticky'),
                })),

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

          html.tags([
            relations.contentHeading.clone()
              .slots({
                attributes: {id: 'artist-commentary'},
                title: language.$('misc.artistCommentary'),
              }),

            relations.artistCommentaryEntries,
          ]),

          html.tags([
            relations.contentHeading.clone()
              .slots({
                attributes: {id: 'credit-sources'},
                title: language.$('misc.creditSources'),
              }),

            relations.creditSourceEntries,
          ]),
        ],

        navLinkStyle: 'hierarchical',
        navLinks: html.resolve(relations.navLinks),

        navBottomRowContent:
          relations.albumNavAccent.slots({
            showTrackNavigation: true,
            showExtraLinks: false,
          }),

        secondaryNav:
          relations.secondaryNav
            .slot('mode', 'track'),

        leftSidebar: relations.sidebar,

        socialEmbed: relations.socialEmbed,
      })),
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
