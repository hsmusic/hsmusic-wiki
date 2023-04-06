import {accumulateSum, empty} from '../../util/sugar.js';

export default {
  contentDependencies: [
    'generateAdditionalFilesShortcut',
    'generateAlbumAdditionalFilesList',
    'generateAlbumTrackList',
    'generateContributionLinks',
    'generateContentHeading',
    'generateCoverArtwork',
    'linkAlbumCommentary',
    'linkAlbumGallery',
    'linkExternal',
  ],

  extraDependencies: [
    'html',
    'language',
    'transformMultiline',
  ],

  relations(relation, album) {
    const relations = {};

    relations.cover =
      relation('generateCoverArtwork', album.artTags);

    const contributionLinksRelation = contribs =>
      relation('generateContributionLinks', contribs, {
        showContribution: true,
        showIcons: true,
      });

    relations.artistLinks =
      contributionLinksRelation(album.artistContribs);

    relations.coverArtistLinks =
      contributionLinksRelation(album.coverArtistContribs);

    relations.wallpaperArtistLinks =
      contributionLinksRelation(album.wallpaperArtistContribs);

    relations.bannerArtistLinks =
      contributionLinksRelation(album.bannerArtistContribs);

    const contentHeadingRelation = () =>
      relation('generateContentHeading');

    if (album.tracks.some(t => t.hasUniqueCoverArt)) {
      relations.galleryLink =
        relation('linkAlbumGallery', album);
    }

    if (album.commentary || album.tracks.some(t => t.commentary)) {
      relations.commentaryLink =
        relation('linkAlbumCommentary', album);
    }

    relations.externalLinks =
      (empty(album.urls)
        ? null
        : album.urls.map(url =>
            relation('linkExternal', url, {type: 'album'})));

    relations.trackList = relation('generateAlbumTrackList', album);

    if (!empty(album.additionalFiles)) {
      relations.additionalFilesShortcut =
        relation('generateAdditionalFilesShortcut', album.additionalFiles);

      relations.additionalFilesHeading =
        contentHeadingRelation();

      relations.additionalFilesList =
        relation('generateAlbumAdditionalFilesList', album);
    }

    relations.artistCommentaryHeading =
      contentHeadingRelation();

    return relations;
  },

  data(album) {
    const data = {};

    data.coverArtDirectory = album.directory;
    data.coverArtFileExtension = album.coverArtFileExtension;

    data.date = album.date;
    data.duration = accumulateSum(album.tracks, track => track.duration);
    data.durationApproximate = album.tracks.length > 1;

    if (
      album.hasCoverArt &&
      album.coverArtDate &&
      +album.coverArtDate !== +album.date
    ) {
      data.coverArtDate = album.coverArtDate;
    }

    if (!empty(album.additionalFiles)) {
      data.numAdditionalFiles = album.additionalFiles.length;
    }

    data.dateAddedToWiki = album.dateAddedToWiki;
    data.artistCommentary = album.commentary;

    return data;
  },

  generate(data, relations, {
    html,
    language,
    transformMultiline,
  }) {
    const content = {};

    content.cover = relations.cover
      .slot('path', ['media.albumCover', data.coverArtDirectory, data.coverArtFileExtension])
      .slot('alt', language.$('misc.alt.trackCover'));

    content.main = {
      headingMode: 'sticky',
      content: html.tag(null, [
        html.tag('p',
          {
            [html.onlyIfContent]: true,
            [html.joinChildren]: '<br>',
          },
          [
            relations.artistLinks &&
              language.$('releaseInfo.by', {
                artists: relations.artistLinks,
              }),

            relations.coverArtistLinks &&
              language.$('releaseInfo.coverArtBy', {
                artists: relations.coverArtistLinks,
              }),

            relations.wallpaperArtistLinks &&
              language.$('releaseInfo.wallpaperArtBy', {
                artists: relations.wallpaperArtistLinks,
              }),

            relations.bannerArtistLinks &&
              language.$('releaseInfo.bannerArtBy', {
                artists: relations.bannerArtistLinks,
              }),

            data.date &&
              language.$('releaseInfo.released', {
                date: language.formatDate(data.date),
              }),

            data.coverArtDate &&
              language.$('releaseInfo.artReleased', {
                date: language.formatDate(data.coverArtDate),
              }),

            data.duration &&
              language.$('releaseInfo.duration', {
                duration:
                  language.formatDuration(data.duration, {
                    approximate: data.durationApproximate,
                  }),
              }),
          ]),

        html.tag('p',
          {
            [html.onlyIfContent]: true,
            [html.joinChildren]: html.tag('br'),
          },
          [
            relations.additionalFilesShortcut,

            relations.galleryLink &&
              language.$('releaseInfo.viewGallery', {
                link:
                  relations.galleryLink
                    .slot('content', language.$('releaseInfo.viewGallery.link')),
              }),

            relations.commentaryLink &&
              language.$('releaseInfo.viewCommentary', {
                link:
                  relations.commentaryLink
                    .slot('content', language.$('releaseInfo.viewCommentary.link')),
              }),
          ]),

        !empty(relations.externalLinks) &&
          html.tag('p',
            language.$('releaseInfo.listenOn', {
              links: language.formatDisjunctionList(relations.externalLinks),
            })),

        relations.trackList,

        html.tag('p',
          {
            [html.onlyIfContent]: true,
            [html.joinChildren]: '<br>',
          },
          [
            data.dateAddedToWiki &&
              language.$('releaseInfo.addedToWiki', {
                date: language.formatDate(data.dateAddedToWiki),
              }),
          ]),

        relations.additionalFilesList && [
          relations.additionalFilesHeading
            .slot('id', 'additional-files')
            .slot('title',
              language.$('releaseInfo.additionalFiles.heading', {
                additionalFiles:
                  language.countAdditionalFiles(data.numAdditionalFiles, {unit: true}),
              })),

          relations.additionalFilesList,
        ],

        data.artistCommentary && [
          relations.artistCommentaryHeading
            .slot('id', 'artist-commentary')
            .slot('title', language.$('releaseInfo.artistCommentary')),

          html.tag('blockquote',
            transformMultiline(data.artistCommentary)),
        ],
      ]),
    };

    return content;
  },
};

/*
  banner: !empty(album.bannerArtistContribs) && {
    dimensions: album.bannerDimensions,
    path: [
      'media.albumBanner',
      album.directory,
      album.bannerFileExtension,
    ],
    alt: language.$('misc.alt.albumBanner'),
    position: 'top',
  },

  sidebarLeft: generateAlbumSidebar(album, null, {
    fancifyURL,
    getLinkThemeString,
    html,
    link,
    language,
    transformMultiline,
    wikiData,
  }),

  nav: {
    linkContainerClasses: ['nav-links-hierarchy'],
    links: [
      {toHome: true},
      {
        html: language.$('albumPage.nav.album', {
          album: link.album(album, {class: 'current'}),
        }),
      },
      {
        divider: false,
        html: generateAlbumNavLinks(album, null, {
          generateNavigationLinks,
          html,
          language,
          link,
        }),
      }
    ],
    content: generateAlbumChronologyLinks(album, null, {
      generateChronologyLinks,
      html,
    }),
  },

  secondaryNav: generateAlbumSecondaryNav(album, null, {
    getLinkThemeString,
    html,
    language,
    link,
  }),
*/
