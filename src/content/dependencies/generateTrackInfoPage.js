import {sortMotifConnectionsByTimeInTrack} from '#sort';

function checkInterrupted(which, relations, {html}) {
  if (
    !html.isBlank(relations.additionalFilesList) ||
    !html.isBlank(relations.contributorContributionList) ||
    !html.isBlank(relations.flashesThatFeatureList) ||
    !html.isBlank(relations.lyricsSection) ||
    !html.isBlank(relations.midiProjectFilesList) ||
    !html.isBlank(relations.featuredMotifsList) ||
    !html.isBlank(relations.referencedByTracksList) ||
    !html.isBlank(relations.referencedTracksList) ||
    !html.isBlank(relations.sampledByTracksList) ||
    !html.isBlank(relations.sampledTracksList) ||
    !html.isBlank(relations.sheetMusicFilesList)
  ) return true;

  if (which === 'crediting-sources' || which === 'referencing-sources') {
    if (!html.isBlank(relations.artistCommentarySection)) return true;
  }

  return false;
}

export default {
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

    albumNavSwitcher:
      relation('generateAlbumNavSwitcher', track.album, track),

    secondaryNav:
      relation('generateAlbumSecondaryNav', track.album),

    sidebar:
      relation('generateAlbumSidebar', track.album, track),

    additionalNamesBox:
      relation('generateAdditionalNamesBox', track.additionalNames),

    artworkColumn:
      (query.firstTrackInSingle
        ? relation('generateSingleArtworkColumn', track)
        : relation('generateTrackArtworkColumn', track)),

    banner:
      (track.album.hasBannerArt
        ? relation('generateAlbumBanner', track.album)
        : null),

    contentHeading:
      relation('generateContentHeading'),

    connectionsContentHeading:
      relation('generateTrackConnectionsContentHeading', track),

    name:
      relation('generateName', track),

    releaseInfo:
      relation('generateTrackReleaseInfo', track),

    readCommentaryLine:
      relation('generateReadCommentaryLine', track),

    otherReleasesLines:
      relation('generateTrackInfoPageOtherReleasesLines', track),

    contributorContributionList:
      relation('generateContributionList',
        track.contributorContribs,
        track.contributorText),

    referencedTracksList:
      relation('generateReferencedTracksList', track),

    sampledTracksList:
      relation('generateNearbyTrackList', track.sampledTracks, track, []),

    featuredMotifsList:
      relation('generateMotifConnectionList',
        sortMotifConnectionsByTimeInTrack(track.featuredMotifs.slice()),
        track),

    referencedByTracksList:
      relation('generateDividedTrackList',
        query.mainReleaseTrack.referencedByTracks,
        track),

    sampledByTracksList:
      relation('generateDividedTrackList',
        query.mainReleaseTrack.sampledByTracks,
        track),

    flashesThatFeatureList:
      relation('generateDividedFeaturedInFlashesList', track.featuredInFlashes, track),

    lyricsSection:
      relation('generateLyricsSection', track.lyrics),

    sheetMusicFilesList:
      relation('generateAdditionalFilesList', track.sheetMusicFiles),

    midiProjectFilesList:
      relation('generateAdditionalFilesList', track.midiProjectFiles),

    miscellaneousAdditionalFilesList:
      relation('generateAdditionalFilesList', track.additionalFiles),

    artistCommentarySection:
      relation('generateTrackArtistCommentarySection', track),

    creditingSourcesSection:
      relation('generateCollapsedContentEntrySection',
        track.creditingSources,
        track),

    referencingSourcesSection:
      relation('generateCollapsedContentEntrySection',
        track.referencingSources,
        track),
  }),

  data: (query, track) => ({
    name:
      track.name,

    nameStyle:
      track.nameStyle,

    nameDetail:
      (track.album.style === 'meta'
        ? track.nameDetailWithinAlbum
        : null),

    color:
      track.color,

    dateAlbumAddedToWiki:
      track.album.dateAddedToWiki,

    needsLyrics:
      track.needsLyrics,

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
            track: relations.name,
          }),

        titleDetail:
          language.sanitize(data.nameDetail),

        headingMode: 'sticky',

        additionalNames: relations.additionalNamesBox,

        color: data.color,
        styleTags: relations.albumStyleTags,

        artworkColumnContent:
          relations.artworkColumn,

        mainContent: [
          data.nameStyle === 'unofficial' &&
            html.tag('p',
              html.tag('i',
                language.$('releaseInfo.unofficialName', {
                  name: data.name,
                }))),

          data.nameStyle === 'unofficial localization' &&
            html.tag('p',
              html.tag('i',
                language.$('releaseInfo.unofficialLocalization', {
                  name: data.name,
                }))),

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

              !html.isBlank(relations.miscellaneousAdditionalFilesList) &&
                language.encapsulate(capsule, 'miscellaneousAdditionalFiles.shortcut', capsule =>
                  language.$(capsule, {
                    link:
                      html.tag('a',
                        {href: '#additional-files'},
                        language.$(capsule, 'link')),
                  })),

              checkInterrupted('commentary', relations, {html}) &&
                relations.readCommentaryLine,

              !html.isBlank(relations.creditingSourcesSection) &&
              checkInterrupted('crediting-sources', relations, {html}) &&
                language.encapsulate(capsule, 'readCreditingSources', capsule =>
                  language.$(capsule, {
                    link:
                      html.tag('a',
                        {href: '#crediting-sources'},
                        language.$(capsule, 'link')),
                  })),

              !html.isBlank(relations.referencingSourcesSection) &&
              checkInterrupted('referencing-sources', relations, {html}) &&
                language.encapsulate(capsule, 'readReferencingSources', capsule =>
                  language.$(capsule, {
                    link:
                      html.tag('a',
                        {href: '#referencing-sources'},
                        language.$(capsule, 'link')),
                  })),
            ])),

          html.tag('p',
            {[html.onlyIfContent]: true},
            {[html.joinChildren]: html.tag('br')},
            relations.otherReleasesLines),

          relations.contributorContributionList.slots({
            attributes: {id: 'contributors'},
            title: language.$('releaseInfo.contributors'),

            chronologyKind: 'trackContribution',
          }),

          html.tags([
            relations.connectionsContentHeading.clone().slots({
              attributes: {id: 'references'},
              string: 'releaseInfo.tracksReferenced',
            }),

            relations.referencedTracksList,
          ]),

          html.tags([
            relations.connectionsContentHeading.clone().slots({
              attributes: {id: 'samples'},
              string: 'releaseInfo.tracksSampled',
            }),

            relations.sampledTracksList,
          ]),

          html.tags([
            language.encapsulate('releaseInfo.motifsFeatured', capsule =>
              relations.connectionsContentHeading.clone().slots({
                attributes: {id: 'features-motifs'},
                string: capsule,
              })),

            relations.featuredMotifsList,
          ]),

          language.encapsulate('releaseInfo.tracksThatReference', capsule =>
            html.tags([
              relations.connectionsContentHeading.clone().slots({
                attributes: {id: 'referenced-by'},
                string: capsule,
              }),

              relations.referencedByTracksList.slots({
                headingString: capsule,
              }),
            ])),

          language.encapsulate('releaseInfo.tracksThatSample', capsule =>
            html.tags([
              relations.connectionsContentHeading.clone().slots({
                attributes: {id: 'sampled-by'},
                string: capsule,
              }),

              relations.sampledByTracksList.slots({
                headingString: capsule,
              }),
            ])),

          html.tags([
            relations.connectionsContentHeading.clone().slots({
              attributes: {id: 'featured-in'},
              string: 'releaseInfo.flashesThatFeature',
            }),

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
           !html.isBlank(relations.artistCommentarySection)) &&
            html.tag('hr', {class: 'main-separator'}),

          data.needsLyrics &&
          html.isBlank(relations.lyricsSection) &&
            html.tag('p',
              language.$(pageCapsule, 'needsLyrics')),

          relations.lyricsSection,

          html.tags([
            relations.contentHeading.clone().slots({
              attributes: {id: 'sheet-music-files'},
              title: language.$('releaseInfo.sheetMusicFiles.heading'),
            }),

            relations.sheetMusicFilesList.slots({
              string: 'sheetMusicFiles',
            }),
          ]),

          html.tags([
            relations.contentHeading.clone().slots({
              attributes: {id: 'midi-project-files'},
              title: language.$('releaseInfo.midiProjectFiles.heading'),
            }),

            relations.midiProjectFilesList.slots({
              string: 'midiProjectFiles',
            }),
          ]),

          html.tags([
            relations.contentHeading.clone().slots({
              attributes: {id: 'additional-files'},
              title: language.$('releaseInfo.miscellaneousAdditionalFiles.heading'),
            }),

            relations.miscellaneousAdditionalFilesList.slots({
              string: 'miscellaneousAdditionalFiles',
            }),
          ]),

          relations.artistCommentarySection,

          relations.creditingSourcesSection.slots({
            id: 'crediting-sources',
            string: 'misc.creditingSources',
          }),

          relations.referencingSourcesSection.slots({
            id: 'referencing-sources',
            string: 'misc.referencingSources',
          }),
        ],

        navLinkStyle: 'hierarchical',
        navLinks:
          (data.singleTrackSingle
            ? [
                {auto: 'home'},
                {
                  html: relations.albumNavLink,
                  accent:
                    language.$(pageCapsule, 'nav.albumAccent.type.single'),
                },
              ]
            : html.resolve(relations.navLinks)),

        navBottomRowContent:
          (data.singleTrackSingle
            ? null
            : relations.albumNavSwitcher.slots({
                showTrackNavigation: true,
                showExtraLinks: false,
              })),

        banner:
          relations.banner
            ?.slot('mode', data.firstTrackInSingle ? 'main' : 'sub') ??
          null,

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
