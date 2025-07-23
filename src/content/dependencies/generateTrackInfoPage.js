export default {
  contentDependencies: [
    'generateAdditionalFilesList',
    'generateAdditionalNamesBox',
    'generateAlbumArtworkColumn',
    'generateAlbumNavAccent',
    'generateAlbumSecondaryNav',
    'generateAlbumSidebar',
    'generateAlbumStyleTags',
    'generateCommentaryEntry',
    'generateContentContentHeading',
    'generateContentHeading',
    'generateContributionList',
    'generateLyricsSection',
    'generateMediaSubtitle',
    'generatePageLayout',
    'generateReadCommentaryLine',
    'generateTrackArtistCommentarySection',
    'generateTrackArtworkColumn',
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

  extraDependencies: ['html', 'language'],

  query: (track) => ({
    mainReleaseTrack:
      (track.isMainRelease
        ? track
        : track.mainReleaseTrack),

    singleTrackSingle:
      track.album.style === 'single' &&
      track.album.tracks.length === 1,

    firstTrackInSingle:
      track.album.style === 'single' &&
      track === track.album.tracks[0],
  }),

  relations: (relation, query, track) => ({
    layout:
      relation('generatePageLayout'),

    albumStyleTags:
      relation('generateAlbumStyleTags', track.album, track),

    socialEmbed:
      relation('generateTrackSocialEmbed', track),

    navLinks:
      relation('generateTrackNavLinks', track),

    albumNavLink:
      relation('linkAlbum', track.album),

    albumNavAccent:
      relation('generateAlbumNavAccent', track.album, track),

    secondaryNav:
      relation('generateAlbumSecondaryNav', track.album),

    sidebar:
      relation('generateAlbumSidebar', track.album, track),

    mediaSubtitle:
      relation('generateMediaSubtitle', track),

    additionalNamesBox:
      relation('generateAdditionalNamesBox', track.additionalNames),

    artworkColumn:
      (query.firstTrackInSingle
        ? relation('generateAlbumArtworkColumn', track.album)
        : relation('generateTrackArtworkColumn', track)),

    contentHeading:
      relation('generateContentHeading'),

    contentContentHeading:
      relation('generateContentContentHeading', track),

    releaseInfo:
      relation('generateTrackReleaseInfo', track),

    readCommentaryLine:
      relation('generateReadCommentaryLine', track),

    otherReleasesList:
      relation('generateTrackInfoPageOtherReleasesList', track),

    contributorContributionList:
      relation('generateContributionList', track.contributorContribs),

    referencedTracksList:
      relation('generateTrackList', track.referencedTracks, track),

    sampledTracksList:
      relation('generateTrackList', track.sampledTracks, track),

    referencedByTracksList:
      relation('generateTrackListDividedByGroups',
        query.mainReleaseTrack.referencedByTracks,
        track),

    sampledByTracksList:
      relation('generateTrackListDividedByGroups',
        query.mainReleaseTrack.sampledByTracks,
        track),

    flashesThatFeatureList:
      relation('generateTrackInfoPageFeaturedByFlashesList', track),

    lyricsSection:
      relation('generateLyricsSection', track.lyrics),

    sheetMusicFilesList:
      relation('generateAdditionalFilesList', track.sheetMusicFiles),

    midiProjectFilesList:
      relation('generateAdditionalFilesList', track.midiProjectFiles),

    additionalFilesList:
      relation('generateAdditionalFilesList', track.additionalFiles),

    artistCommentarySection:
      relation('generateTrackArtistCommentarySection', track),

    creditingSourceEntries:
      track.creditingSources
        .map(entry => relation('generateCommentaryEntry', entry)),

    referencingSourceEntries:
      track.referencingSources
        .map(entry => relation('generateCommentaryEntry', entry)),
  }),

  data: (query, track) => ({
    name:
      track.name,

    color:
      track.color,

    dateAlbumAddedToWiki:
      track.album.dateAddedToWiki,

    singleTrackSingle:
      query.singleTrackSingle,

    firstTrackInSingle:
      query.firstTrackInSingle,
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('trackPage', pageCapsule =>
      relations.layout.slots({
        title:
          language.$(pageCapsule, 'title', {
            track: data.name,
          }),

        subtitle:
          relations.mediaSubtitle.slots({
            pageCapsule,
          }),

        headingMode: 'sticky',

        additionalNames: relations.additionalNamesBox,

        color: data.color,
        styleTags: relations.albumStyleTags,

        artworkColumnContent:
          relations.artworkColumn,

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

              (!html.isBlank(relations.additionalFilesList) ||
               !html.isBlank(relations.contributorContributionList) ||
               !html.isBlank(relations.creditingSourceEntries) ||
               !html.isBlank(relations.flashesThatFeatureList) ||
               !html.isBlank(relations.lyricsSection) ||
               !html.isBlank(relations.midiProjectFilesList) ||
               !html.isBlank(relations.referencedByTracksList) ||
               !html.isBlank(relations.referencedTracksList) ||
               !html.isBlank(relations.referencingSourceEntries) ||
               !html.isBlank(relations.sampledByTracksList) ||
               !html.isBlank(relations.sampledTracksList) ||
               !html.isBlank(relations.sheetMusicFilesList)) &&
                relations.readCommentaryLine,

              !html.isBlank(relations.creditingSourceEntries) &&
                language.encapsulate(capsule, 'readCreditingSources', capsule =>
                  language.$(capsule, {
                    link:
                      html.tag('a',
                        {href: '#crediting-sources'},
                        language.$(capsule, 'link')),
                  })),

              !html.isBlank(relations.referencingSourceEntries) &&
                language.encapsulate(capsule, 'readReferencingSources', capsule =>
                  language.$(capsule, {
                    link:
                      html.tag('a',
                        {href: '#referencing-sources'},
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

          language.encapsulate('releaseInfo.mediaRepresented', capsule =>
            html.tags([
              relations.contentHeading.clone()
                .slots({
                  title:
                    language.$(capsule, {
                      track:
                        html.tag('i', data.name),
                    }),

                  stickyTitle:
                    language.$(capsule, 'sticky'),
                }),

              relations.representedMediaList,
            ])),

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

          data.firstTrackInSingle &&
            html.tag('p',
              {[html.onlyIfContent]: true},

              language.$('releaseInfo.addedToWiki', {
                [language.onlyIfOptions]: ['date'],
                date: language.formatDate(data.dateAlbumAddedToWiki),
              })),

          data.firstTrackInSingle &&
          (!html.isBlank(relations.lyricsSection) ||
           !html.isBlank(relations.artistCommentarySection) ||
           !html.isBlank(relations.creditingSourceEntries) ||
           !html.isBlank(relations.referencingSourceEntries)) &&
            html.tag('hr', {class: 'main-separator'}),

          relations.lyricsSection,

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

          html.tags([
            relations.contentContentHeading.clone()
              .slots({
                attributes: {id: 'crediting-sources'},
                string: 'misc.creditingSources',
              }),

            relations.creditingSourceEntries,
          ]),

          html.tags([
            relations.contentContentHeading.clone()
              .slots({
                attributes: {id: 'referencing-sources'},
                string: 'misc.referencingSources',
              }),

            relations.referencingSourceEntries,
          ]),
        ],

        navLinkStyle: 'hierarchical',
        navLinks:
          (data.singleTrackSingle
            ? [
                {auto: 'home'},
                {
                  html: relations.albumNavLink,
                  accent: language.$(pageCapsule, 'nav.singleAccent'),
                },
              ]
            : html.resolve(relations.navLinks)),

        navBottomRowContent:
          (data.singleTrackSingle
            ? null
            : relations.albumNavAccent.slots({
                showTrackNavigation: true,
                showExtraLinks: false,
              })),

        secondaryNav:
          relations.secondaryNav
            .slot('mode', data.firstTrackInSingle ? 'album' : 'track'),

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
