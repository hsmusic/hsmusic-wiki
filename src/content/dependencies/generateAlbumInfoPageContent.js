import {accumulateSum, empty} from '../../util/sugar.js';

export default {
  contentDependencies: [
    'generateAdditionalFilesShortcut',
    'generateAlbumAdditionalFilesList',
    'generateAlbumTrackList',
    'generateContentHeading',
    'generateCoverArtwork',
    'linkAlbumCommentary',
    'linkAlbumGallery',
    'linkContribution',
    'linkExternal',
  ],

  extraDependencies: [
    'html',
    'language',
    'transformMultiline',
  ],

  relations(relation, album) {
    const relations = {};

    const contributionLinksRelation = contribs =>
      contribs.map(contrib =>
        relation('linkContribution', contrib.who, contrib.what));

    if (album.hasCoverArt) {
      relations.cover =
        relation('generateCoverArtwork', album.artTags);
    }

    relations.artistLinks =
      contributionLinksRelation(album.artistContribs);

    relations.coverArtistLinks =
      contributionLinksRelation(album.coverArtistContribs);

    relations.wallpaperArtistLinks =
      contributionLinksRelation(album.wallpaperArtistContribs);

    relations.bannerArtistLinks =
      contributionLinksRelation(album.bannerArtistContribs);

    if (album.tracks.some(t => t.hasUniqueCoverArt)) {
      relations.galleryLink =
        relation('linkAlbumGallery', album);
    }

    if (album.commentary || album.tracks.some(t => t.commentary)) {
      relations.commentaryLink =
        relation('linkAlbumCommentary', album);
    }

    relations.externalLinks =
      album.urls.map(url =>
        relation('linkExternal', url, {type: 'album'}));

    relations.trackList = relation('generateAlbumTrackList', album);

    if (!empty(album.additionalFiles)) {
      relations.additionalFilesShortcut =
        relation('generateAdditionalFilesShortcut', album.additionalFiles);

      relations.additionalFilesHeading =
        relation('generateContentHeading');

      relations.additionalFilesList =
        relation('generateAlbumAdditionalFilesList', album);
    }

    relations.artistCommentaryHeading =
      relation('generateContentHeading');

    return relations;
  },

  data(album) {
    const data = {};

    data.date = album.date;
    data.duration = accumulateSum(album.tracks, track => track.duration);
    data.durationApproximate = album.tracks.length > 1;

    data.hasCoverArt = album.hasCoverArt;

    if (album.hasCoverArt) {
      data.coverArtDirectory = album.directory;
      data.coverArtFileExtension = album.coverArtFileExtension;

      if (album.coverArtDate && +album.coverArtDate !== +album.date) {
        data.coverArtDate = album.coverArtDate;
      }
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

    const formatContributions = contributionLinks =>
      language.formatConjunctionList(
        contributionLinks.map(link =>
          link
            .slots({
              showContribution: true,
              showIcons: true,
            })));

    if (data.hasCoverArt) {
      content.cover = relations.cover
        .slots({
          path: ['media.albumCover', data.coverArtDirectory, data.coverArtFileExtension],
          alt: language.$('misc.alt.trackCover')
        });
    }

    content.main = {
      headingMode: 'sticky',
      content: html.tags([
        html.tag('p',
          {
            [html.onlyIfContent]: true,
            [html.joinChildren]: html.tag('br'),
          },
          [
            !empty(relations.artistLinks) &&
              language.$('releaseInfo.by', {
                artists: formatContributions(relations.artistLinks),
              }),

            !empty(relations.coverArtistLinks) &&
              language.$('releaseInfo.coverArtBy', {
                artists: formatContributions(relations.coverArtistLinks),
              }),

            !empty(relations.wallpaperArtistLinks) &&
              language.$('releaseInfo.wallpaperArtBy', {
                artists: formatContributions(relations.wallpaperArtistLinks),
              }),

            !empty(relations.bannerArtistLinks) &&
              language.$('releaseInfo.bannerArtBy', {
                artists: formatContributions(relations.bannerArtistLinks),
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
            .slots({
              id: 'additional-files',

              title:
                language.$('releaseInfo.additionalFiles.heading', {
                  additionalFiles:
                    language.countAdditionalFiles(data.numAdditionalFiles, {unit: true}),
                }),
            }),

          relations.additionalFilesList,
        ],

        data.artistCommentary && [
          relations.artistCommentaryHeading
            .slots({
              id: 'artist-commentary',
              title: language.$('releaseInfo.artistCommentary')
            }),

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
