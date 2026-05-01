import {empty, stitchArrays, unique} from '#sugar';

export default {
  query: (artist) => ({
    trackContributions: [
      ...artist.trackArtistContributions,
      ...artist.trackContributorContributions,
    ],

    artworkContributions: [
      ...artist.albumCoverArtistContributions,
      ...artist.albumWallpaperArtistContributions,
      ...artist.albumBannerArtistContributions,
      ...artist.trackCoverArtistContributions,
    ],

    musicVideoContributions: [
      ...artist.musicVideoArtistContributions,
      ...artist.musicVideoContributorContributions,
    ],

    // Banners and wallpapers don't show up in the artist gallery page, only
    // cover art.
    hasGallery:
      !empty(artist.albumCoverArtistContributions) ||
      !empty(artist.trackCoverArtistContributions),

    aliasLinkedGroups:
      artist.closelyLinkedGroups
        .filter(({annotation}) =>
          annotation === 'alias'),

    generalLinkedGroups:
      artist.closelyLinkedGroups
        .filter(({annotation}) =>
          annotation !== 'alias'),
  }),

  relations: (relation, query, artist) => ({
    layout:
      relation('generatePageLayout'),

    artistNavLinks:
      relation('generateArtistNavLinks', artist),

    artworkColumn:
      relation('generateArtistArtworkColumn', artist),

    contentHeading:
      relation('generateContentHeading'),

    contextNotes:
      relation('transformContent', artist.contextNotes),

    closeGroupLinks:
      query.generalLinkedGroups
        .map(({group}) => relation('linkGroup', group)),

    aliasGroupLinks:
      query.aliasLinkedGroups
        .map(({group}) => relation('linkGroup', group)),

    visitLinks:
      artist.urls
        .map(entry => relation('linkExternal', entry)),

    tracksChunkedList:
      relation('generateArtistInfoPageTracksChunkedList', artist),

    tracksGroupInfo:
      relation('generateArtistGroupContributionsInfo', query.trackContributions),

    artworksChunkedList:
      relation('generateArtistInfoPageArtworksChunkedList', artist, false),

    editsForWikiArtworksChunkedList:
      relation('generateArtistInfoPageArtworksChunkedList', artist, true),

    artworksGroupInfo:
      relation('generateArtistGroupContributionsInfo', query.artworkContributions),

    artistGalleryLink:
      (query.hasGallery
        ? relation('linkArtistGallery', artist)
        : null),

    musicVideosChunkedList:
      relation('generateArtistInfoPageMusicVideosChunkedList', artist),

    musicVideosGroupInfo:
      relation('generateArtistGroupContributionsInfo', query.musicVideoContributions),

    flashesChunkedList:
      relation('generateArtistInfoPageFlashesChunkedList', artist),

    commentaryChunkedList:
      relation('generateArtistInfoPageCommentaryChunkedList', artist, false),

    wikiEditorCommentaryChunkedList:
      relation('generateArtistInfoPageCommentaryChunkedList', artist, true),
  }),

  data: (query, artist) => ({
    name:
      artist.name,

    closeGroupAnnotations:
      query.generalLinkedGroups
        .map(({annotation}) => annotation),

    totalTrackCount:
      unique(
        query.trackContributions
          .filter(contrib => contrib.countInContributionTotals)
          .map(contrib => contrib.thing))
        .length,

    totalDuration:
      artist.totalDuration,
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('artistPage', pageCapsule =>
      relations.layout.slots({
        title: data.name,
        headingMode: 'sticky',

        artworkColumnContent:
          relations.artworkColumn,

        mainContent: [
          html.tags([
            html.tag('p',
              {[html.onlyIfSiblings]: true},
              language.$('releaseInfo.note')),

            html.tag('blockquote',
              {[html.onlyIfContent]: true},
              relations.contextNotes),
          ]),

          html.tag('p',
            {[html.onlyIfContent]: true},
            {[html.joinChildren]: html.tag('br')},

            language.encapsulate(pageCapsule, 'closelyLinkedGroups', capsule => [
              language.encapsulate(capsule, capsule => {
                const [workingCapsule, option] =
                  (relations.closeGroupLinks.length === 0
                    ? [null, null]
                 : relations.closeGroupLinks.length === 1
                    ? [language.encapsulate(capsule, 'one'), 'group']
                    : [language.encapsulate(capsule, 'multiple'), 'groups']);

                if (!workingCapsule) return html.blank();

                return language.$(workingCapsule, {
                  [option]:
                    language.formatUnitList(
                      stitchArrays({
                        link: relations.closeGroupLinks,
                        annotation: data.closeGroupAnnotations,
                      }).map(({link, annotation}) =>
                          language.encapsulate(capsule, 'group', workingCapsule => {
                            const workingOptions = {group: link};

                            if (annotation) {
                              workingCapsule += '.withAnnotation';
                              workingOptions.annotation = annotation;
                            }

                            return language.$(workingCapsule, workingOptions);
                          }))),
                });
              }),

              language.$(capsule, 'alias', {
                [language.onlyIfOptions]: ['groups'],

                groups:
                  language.formatConjunctionList(relations.aliasGroupLinks),
              }),
            ])),

          html.tag('p',
            {[html.onlyIfContent]: true},

            language.$('releaseInfo.visitOn', {
              [language.onlyIfOptions]: ['links'],

              links:
                language.formatDisjunctionList(
                  relations.visitLinks
                    .map(link => link.slot('context', 'artist'))),
            })),

          html.tag('p',
            {[html.onlyIfContent]: true},

            language.encapsulate(pageCapsule, 'viewArtGallery', capsule =>
              language.$(capsule, {
                [language.onlyIfOptions]: ['link'],

                link:
                  relations.artistGalleryLink?.slots({
                    content:
                      language.$(capsule, 'link'),
                  }),
              }))),

          html.tag('p',
            {[html.onlyIfContent]: true},

            language.$('misc.jumpTo.withLinks', {
              [language.onlyIfOptions]: ['links'],

              links:
                language.formatUnitList([
                  !html.isBlank(relations.tracksChunkedList) &&
                    html.tag('a',
                      {href: '#tracks'},
                      language.$(pageCapsule, 'trackList.title')),

                  (!html.isBlank(relations.artworksChunkedList) ||
                   !html.isBlank(relations.editsForWikiArtworksChunkedList)) &&
                      html.tag('a',
                        {href: '#art'},
                        language.$(pageCapsule, 'artList.title')),

                  !html.isBlank(relations.musicVideosChunkedList) &&
                    html.tag('a',
                      {href: '#music-videos'},
                      language.$(pageCapsule, 'musicVideoList.title')),

                  !html.isBlank(relations.flashesChunkedList) &&
                    html.tag('a',
                      {href: '#flashes'},
                      language.$(pageCapsule, 'flashList.title')),

                  (!html.isBlank(relations.commentaryChunkedList) ||
                   !html.isBlank(relations.wikiEditorCommentaryChunkedList)) &&
                    html.tag('a',
                      {href: '#commentary'},
                      language.$(pageCapsule, 'commentaryList.title')),
                ].filter(Boolean)),
            })),

          html.tags([
            relations.contentHeading.clone()
              .slots({
                tag: 'h2',
                attributes: {id: 'tracks'},
                title: language.$(pageCapsule, 'trackList.title'),
              }),

            data.totalDuration > 0 &&
              html.tag('p',
                {[html.onlyIfSiblings]: true},

                language.$(pageCapsule, 'contributedDurationLine', {
                  artist: data.name,
                  duration:
                    language.formatDuration(data.totalDuration, {
                      approximate: data.totalTrackCount > 1,
                      unit: true,
                    }),
                })),

            relations.tracksChunkedList.slots({
              groupInfo:
                language.encapsulate(pageCapsule, 'groupContributions', capsule => [
                  relations.tracksGroupInfo.clone()
                    .slots({
                      title: language.$(capsule, 'title.music'),
                      showSortButton: true,
                      sort: 'count',
                      countUnit: 'tracks',
                      visible: true,
                    }),

                  relations.tracksGroupInfo.clone()
                    .slots({
                      title: language.$(capsule, 'title.music'),
                      showSortButton: true,
                      sort: 'duration',
                      countUnit: 'tracks',
                      visible: false,
                    }),
                ]),
            }),
          ]),

          html.tags([
            relations.contentHeading.clone()
              .slots({
                tag: 'h2',
                attributes: {id: 'art'},
                title: language.$(pageCapsule, 'artList.title'),
              }),

            html.tag('p',
              {[html.onlyIfContent]: true},

              language.encapsulate(pageCapsule, 'viewArtGallery', capsule =>
                language.$(capsule, 'orBrowseList', {
                  [language.onlyIfOptions]: ['link'],

                  link:
                    relations.artistGalleryLink?.slots({
                      content: language.$(capsule, 'link'),
                    }),
                }))),

            relations.artworksChunkedList
              .slots({
                groupInfo:
                  language.encapsulate(pageCapsule, 'groupContributions', capsule =>
                    relations.artworksGroupInfo
                      .slots({
                        title: language.$(capsule, 'title.artworks'),
                        showBothColumns: false,
                        sort: 'count',
                        countUnit: 'artworks',
                      })),
              }),

            html.tags([
              language.encapsulate(pageCapsule, 'wikiEditArtworks', capsule =>
                relations.contentHeading.clone()
                  .slots({
                    tag: 'p',

                    title:
                      language.$(capsule, {artist: data.name}),

                    stickyTitle:
                      language.$(capsule, 'sticky'),
                  })),

              relations.editsForWikiArtworksChunkedList,
            ]),
          ]),

          html.tags([
            relations.contentHeading.clone()
              .slots({
                tag: 'h2',
                attributes: {id: 'music-videos'},
                title: language.$(pageCapsule, 'musicVideoList.title'),
              }),

            relations.musicVideosChunkedList.slots({
              groupInfo:
                language.encapsulate(pageCapsule, 'groupContributions', capsule =>
                  relations.musicVideosGroupInfo.slots({
                    title: language.$(capsule, 'title.artworks'),
                    showBothColumns: false,
                    sort: 'count',
                    countUnit: 'artworks',
                  })),
            }),
          ]),

          html.tags([
            relations.contentHeading.clone()
              .slots({
                tag: 'h2',
                attributes: {id: 'flashes'},
                title: language.$(pageCapsule, 'flashList.title'),
              }),

            relations.flashesChunkedList,
          ]),

          html.tags([
            relations.contentHeading.clone()
              .slots({
                tag: 'h2',
                attributes: {id: 'commentary'},
                title: language.$(pageCapsule, 'commentaryList.title'),
              }),

            relations.commentaryChunkedList,

            html.tags([
              language.encapsulate(pageCapsule, 'wikiEditorCommentary', capsule =>
                relations.contentHeading.clone()
                  .slots({
                    tag: 'p',

                    title:
                      language.$(capsule, {artist: data.name}),

                    stickyTitle:
                      language.$(capsule, 'sticky'),
                  })),

              relations.wikiEditorCommentaryChunkedList,
            ]),
          ]),
        ],

        navLinkStyle: 'hierarchical',
        navLinks:
          relations.artistNavLinks
            .slots({
              showExtraLinks: true,
            })
            .content,
      })),
};
