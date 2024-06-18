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

  relations: (relation, sprawl, track) => ({
    layout:
      relation('generatePageLayout'),

    albumStyleRules:
      relation('generateAlbumStyleRules', track.album, track),

    socialEmbed:
      relation('generateTrackSocialEmbed', track),

    albumLink:
      relation('linkAlbum', track.album),

    trackLink:
      relation('linkTrack', track),

    albumNavAccent:
      relation('generateAlbumNavAccent', track.album, track),

    chronologyLinks:
      relation('generateTrackChronologyLinks', track),

    secondaryNav:
      relation('generateAlbumSecondaryNav', track.album),

    sidebar:
      relation('generateAlbumSidebar', track.album, track),

    additionalNamesBox:
      relation('generateTrackAdditionalNamesBox', track),

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
        track.referencedByTracks,
        sprawl.divideTrackListsByGroups),

    sampledByTracksList:
      relation('generateTrackListDividedByGroups',
        track.sampledByTracks,
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

    artistCommentarySection:
      relation('generateCommentarySection', track.commentary),
  }),

  data: (sprawl, track) => ({
    name:
      track.name,

    color:
      track.color,

    hasTrackNumbers:
      track.album.hasTrackNumbers,

    trackNumber:
      track.album.tracks.indexOf(track) + 1,
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
                alt: language.$('misc.alt.trackCover'),
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

              !html.isBlank(relations.artistCommentarySection) &&
                language.encapsulate(capsule, 'readCommentary', capsule =>
                  language.$(capsule, {
                    link:
                      html.tag('a',
                        {href: '#artist-commentary'},
                        language.$(capsule, 'link')),
                  })),
            ])),

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

          relations.artistCommentarySection,
        ],

        navLinkStyle: 'hierarchical',

        navLinks: [
          {auto: 'home'},

          {html: relations.albumLink.slot('color', false)},

          {
            html:
              language.encapsulate(pageCapsule, 'nav.track', workingCapsule => {
                const workingOptions = {};

                workingOptions.track =
                  relations.trackLink
                    .slot('attributes', {class: 'current'});

                if (data.hasTrackNumbers) {
                  workingCapsule += '.withNumber';
                  workingOptions.number = data.trackNumber;
                }

                return language.$(workingCapsule, workingOptions);
              }),
          },
        ],

        navBottomRowContent:
          relations.albumNavAccent.slots({
            showTrackNavigation: true,
            showExtraLinks: false,
          }),

        navContent:
          relations.chronologyLinks,

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
