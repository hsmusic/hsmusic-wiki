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
    'linkAlbum',
    'linkArtistGallery',
    'linkExternal',
    'linkGroup',
    'linkTrack',
    'transformContent',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({wikiInfo}) {
    return {
      enableFlashesAndGames: wikiInfo.enableFlashesAndGames,
    };
  },

  query(sprawl, artist) {
    return {
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
          .map(({thing}) => thing),

      // Banners and wallpapers don't show up in the artist gallery page, only
      // cover art.
      hasGallery:
        !empty(artist.albumCoverArtistContributions) ||
        !empty(artist.trackCoverArtistContributions),
    };
  },

  relations(relation, query, sprawl, artist) {
    const relations = {};
    const sections = relations.sections = {};

    relations.layout =
      relation('generatePageLayout');

    relations.artistNavLinks =
      relation('generateArtistNavLinks', artist);

    if (artist.hasAvatar) {
      relations.cover =
        relation('generateCoverArtwork', []);
    }

    if (artist.contextNotes) {
      const contextNotes = sections.contextNotes = {};
      contextNotes.content = relation('transformContent', artist.contextNotes);
    }

    if (!empty(artist.urls)) {
      const visit = sections.visit = {};
      visit.externalLinks =
        artist.urls.map(url =>
          relation('linkExternal', url));
    }

    if (!empty(query.allTracks)) {
      const tracks = sections.tracks = {};
      tracks.heading = relation('generateContentHeading');
      tracks.list = relation('generateArtistInfoPageTracksChunkedList', artist);
      tracks.groupInfo = relation('generateArtistGroupContributionsInfo', query.allTracks);
    }

    if (!empty(query.allArtworks)) {
      const artworks = sections.artworks = {};
      artworks.heading = relation('generateContentHeading');
      artworks.list = relation('generateArtistInfoPageArtworksChunkedList', artist);
      artworks.groupInfo =
        relation('generateArtistGroupContributionsInfo', query.allArtworks);

      if (query.hasGallery) {
        artworks.artistGalleryLink =
          relation('linkArtistGallery', artist);
      }
    }

    if (sprawl.enableFlashesAndGames && !empty(artist.flashContributorContributions)) {
      const flashes = sections.flashes = {};
      flashes.heading = relation('generateContentHeading');
      flashes.list = relation('generateArtistInfoPageFlashesChunkedList', artist);
    }

    if (!empty(artist.albumsAsCommentator) || !empty(artist.tracksAsCommentator)) {
      const commentary = sections.commentary = {};
      commentary.heading = relation('generateContentHeading');
      commentary.list = relation('generateArtistInfoPageCommentaryChunkedList', artist);
    }

    return relations;
  },

  data(query, sprawl, artist) {
    const data = {};

    data.name = artist.name;
    data.directory = artist.directory;

    if (artist.hasAvatar) {
      data.avatarFileExtension = artist.avatarFileExtension;
    }

    data.totalTrackCount = query.allTracks.length;
    data.totalDuration = artist.totalDuration;

    return data;
  },

  generate(data, relations, {html, language}) {
    const {sections: sec} = relations;

    return relations.layout
      .slots({
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
          sec.contextNotes && [
            html.tag('p',
              language.$('releaseInfo.note')),

            html.tag('blockquote',
              sec.contextNotes.content),
          ],

          sec.visit &&
            html.tag('p',
              language.$('releaseInfo.visitOn', {
                links:
                  language.formatDisjunctionList(
                    sec.visit.externalLinks
                      .map(link => link.slot('context', 'artist'))),
              })),

          sec.artworks?.artistGalleryLink &&
            html.tag('p',
              language.$('artistPage.viewArtGallery', {
                link: sec.artworks.artistGalleryLink.slots({
                  content: language.$('artistPage.viewArtGallery.link'),
                }),
              })),

          (sec.tracks || sec.artworsk || sec.flashes || sec.commentary) &&
            html.tag('p',
              language.$('misc.jumpTo.withLinks', {
                links: language.formatUnitList(
                  [
                    sec.tracks &&
                      html.tag('a',
                        {href: '#tracks'},
                        language.$('artistPage.trackList.title')),

                    sec.artworks &&
                      html.tag('a',
                        {href: '#art'},
                        language.$('artistPage.artList.title')),

                    sec.flashes &&
                      html.tag('a',
                        {href: '#flashes'},
                        language.$('artistPage.flashList.title')),

                    sec.commentary &&
                      html.tag('a',
                        {href: '#commentary'},
                        language.$('artistPage.commentaryList.title')),
                  ].filter(Boolean)),
              })),

          sec.tracks && [
            sec.tracks.heading
              .slots({
                tag: 'h2',
                attributes: {id: 'tracks'},
                title: language.$('artistPage.trackList.title'),
              }),

            data.totalDuration > 0 &&
              html.tag('p',
                language.$('artistPage.contributedDurationLine', {
                  artist: data.name,
                  duration:
                    language.formatDuration(data.totalDuration, {
                      approximate: data.totalTrackCount > 1,
                      unit: true,
                    }),
                })),

            sec.tracks.list
              .slots({
                groupInfo: [
                  sec.tracks.groupInfo
                    .clone()
                    .slots({
                      title: language.$('artistPage.groupContributions.title.music'),
                      showSortButton: true,
                      sort: 'count',
                      countUnit: 'tracks',
                      visible: true,
                    }),

                  sec.tracks.groupInfo
                    .clone()
                    .slots({
                      title: language.$('artistPage.groupContributions.title.music'),
                      showSortButton: true,
                      sort: 'duration',
                      countUnit: 'tracks',
                      visible: false,
                    }),
                ],
              }),
          ],

          sec.artworks && [
            sec.artworks.heading
              .slots({
                tag: 'h2',
                attributes: {id: 'art'},
                title: language.$('artistPage.artList.title'),
              }),

            sec.artworks.artistGalleryLink &&
              html.tag('p',
                language.$('artistPage.viewArtGallery.orBrowseList', {
                  link: sec.artworks.artistGalleryLink.slots({
                    content: language.$('artistPage.viewArtGallery.link'),
                  }),
                })),

            sec.artworks.list
              .slots({
                groupInfo:
                  sec.artworks.groupInfo
                    .slots({
                      title: language.$('artistPage.groupContributions.title.artworks'),
                      showBothColumns: false,
                      sort: 'count',
                      countUnit: 'artworks',
                    }),
              }),
          ],

          sec.flashes && [
            sec.flashes.heading
              .slots({
                tag: 'h2',
                attributes: {id: 'flashes'},
                title: language.$('artistPage.flashList.title'),
              }),

            sec.flashes.list,
          ],

          sec.commentary && [
            sec.commentary.heading
              .slots({
                tag: 'h2',
                attributes: {id: 'commentary'},
                title: language.$('artistPage.commentaryList.title'),
              }),

            sec.commentary.list,
          ],
        ],

        navLinkStyle: 'hierarchical',
        navLinks:
          relations.artistNavLinks
            .slots({
              showExtraLinks: true,
            })
            .content,
      });
  },
};
