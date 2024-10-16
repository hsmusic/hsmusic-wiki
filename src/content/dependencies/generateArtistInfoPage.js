import {empty, unique} from '#sugar';

export default {
  contentDependencies: [
    'generateArtistGroupContributionsInfo',
    'generateArtistInfoPageArtworksChunkedList',
    'generateArtistInfoPageCommentaryChunkedList',
    'generateArtistInfoPageFlashesChunkedList',
    'generateArtistInfoPageTracksChunkedList',
    'generateArtistNavLinks',
    'generateContentHeading',
    'generateCoverArtwork',
    'generatePageLayout',
    'linkArtistGallery',
    'linkExternal',
    'transformContent',
  ],

  extraDependencies: ['html', 'language'],

  query: (artist) => ({
    // Even if an artist has served as both "artist" (compositional) and
    // "contributor" (instruments, production, etc) on the same track, that
    // track only counts as one unique contribution in the list.
    allTracks:
      unique(
        ([
          artist.trackArtistContributions,
          artist.trackContributorContributions,
        ]).flat()
          .map(({thing}) => thing)),

    // Artworks are different, though. We intentionally duplicate album data
    // objects when the artist has contributed some combination of cover art,
    // wallpaper, and banner - these each count as a unique contribution.
    allArtworks:
      ([
        artist.albumCoverArtistContributions,
        artist.albumWallpaperArtistContributions,
        artist.albumBannerArtistContributions,
        artist.trackCoverArtistContributions,
      ]).flat()
        .filter(({annotation}) => !annotation?.startsWith('edits for wiki'))
        .map(({thing}) => thing),

    // Banners and wallpapers don't show up in the artist gallery page, only
    // cover art.
    hasGallery:
      !empty(artist.albumCoverArtistContributions) ||
      !empty(artist.trackCoverArtistContributions),
  }),

  relations: (relation, query, artist) => ({
    layout:
      relation('generatePageLayout'),

    artistNavLinks:
      relation('generateArtistNavLinks', artist),

    cover:
      (artist.hasAvatar
        ? relation('generateCoverArtwork', [])
        : null),

    contentHeading:
      relation('generateContentHeading'),

    contextNotes:
      relation('transformContent', artist.contextNotes),

    visitLinks:
      artist.urls
        .map(url => relation('linkExternal', url)),

    tracksChunkedList:
      relation('generateArtistInfoPageTracksChunkedList', artist),

    tracksGroupInfo:
      relation('generateArtistGroupContributionsInfo', query.allTracks),

    artworksChunkedList:
      relation('generateArtistInfoPageArtworksChunkedList', artist, false),

    editsForWikiArtworksChunkedList:
      relation('generateArtistInfoPageArtworksChunkedList', artist, true),

    artworksGroupInfo:
      relation('generateArtistGroupContributionsInfo', query.allArtworks),

    artistGalleryLink:
      (query.hasGallery
        ? relation('linkArtistGallery', artist)
        : null),

    flashesChunkedList:
      relation('generateArtistInfoPageFlashesChunkedList', artist),

    commentaryChunkedList:
      relation('generateArtistInfoPageCommentaryChunkedList', artist),
  }),

  data: (query, artist) => ({
    name:
      artist.name,

    directory:
      artist.directory,

    avatarFileExtension:
      (artist.hasAvatar
        ? artist.avatarFileExtension
        : null),

    totalTrackCount:
      query.allTracks.length,

    totalDuration:
      artist.totalDuration,
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('artistPage', pageCapsule =>
      relations.layout.slots({
        title: data.name,
        headingMode: 'sticky',

        cover:
          (relations.cover
            ? relations.cover.slots({
                path: [
                  'media.artistAvatar',
                  data.directory,
                  data.avatarFileExtension,
                ],
              })
            : null),

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

                  !html.isBlank(relations.flashesChunkedList) &&
                    html.tag('a',
                      {href: '#flashes'},
                      language.$(pageCapsule, 'flashList.title')),

                  !html.isBlank(relations.commentaryChunkedList) &&
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
              html.tag('p',
                {[html.onlyIfSiblings]: true},

                language.$(pageCapsule, 'wikiEditArtworks', {
                  artist: data.name,
                })),

              relations.editsForWikiArtworksChunkedList,
            ]),
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
