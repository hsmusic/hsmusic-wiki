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

    trackChronologyLinks:
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
    relations.layout.slots({
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
    }),
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
