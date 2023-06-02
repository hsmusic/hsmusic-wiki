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
    'transformContent',
  ],

  extraDependencies: ['html', 'language'],

  relations(relation, album) {
    const relations = {};
    const sections = relations.sections = {};

    const contributionLinksRelation = contribs =>
      contribs.map(contrib =>
        relation('linkContribution', contrib.who, contrib.what));

    // Section: Release info

    const releaseInfo = sections.releaseInfo = {};

    if (!empty(album.artistContribs)) {
      releaseInfo.artistContributionLinks =
        contributionLinksRelation(album.artistContribs);
    }

    if (album.hasCoverArt) {
      relations.cover =
        relation('generateCoverArtwork', album.artTags);
      releaseInfo.coverArtistContributionLinks =
        contributionLinksRelation(album.coverArtistContribs);
    } else {
      relations.cover = null;
    }

    if (album.hasWallpaperArt) {
      releaseInfo.wallpaperArtistContributionLinks =
        contributionLinksRelation(album.wallpaperArtistContribs);
    }

    if (album.hasBannerArt) {
      releaseInfo.bannerArtistContributionLinks =
        contributionLinksRelation(album.bannerArtistContribs);
    }

    // Section: Listen on

    if (!empty(album.urls)) {
      const listen = sections.listen = {};

      listen.externalLinks =
        album.urls.map(url =>
          relation('linkExternal', url, {type: 'album'}));
    }

    // Section: Extra links

    const extra = sections.extra = {};

    if (album.tracks.some(t => t.hasUniqueCoverArt)) {
      extra.galleryLink =
        relation('linkAlbumGallery', album);
    }

    if (album.commentary || album.tracks.some(t => t.commentary)) {
      extra.commentaryLink =
        relation('linkAlbumCommentary', album);
    }

    if (!empty(album.additionalFiles)) {
      extra.additionalFilesShortcut =
        relation('generateAdditionalFilesShortcut', album.additionalFiles);
    }

    // Section: Track list

    relations.trackList =
      relation('generateAlbumTrackList', album);

    // Section: Additional files

    if (!empty(album.additionalFiles)) {
      const additionalFiles = sections.additionalFiles = {};

      additionalFiles.heading =
        relation('generateContentHeading');

      additionalFiles.additionalFilesList =
        relation('generateAlbumAdditionalFilesList', album, album.additionalFiles);
    }

    // Section: Artist commentary

    if (album.commentary) {
      const artistCommentary = sections.artistCommentary = {};

      artistCommentary.heading =
        relation('generateContentHeading');

      artistCommentary.content =
        relation('transformContent', album.commentary);
    }

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

    return data;
  },

  generate(data, relations, {
    html,
    language,
  }) {
    const content = {};

    const {sections: sec} = relations;

    const formatContributions =
      (stringKey, contributionLinks, {showContribution = true, showIcons = true} = {}) =>
        contributionLinks &&
          language.$(stringKey, {
            artists:
              language.formatConjunctionList(
                contributionLinks.map(link =>
                  link.slots({showContribution, showIcons}))),
          });

    if (data.hasCoverArt) {
      content.cover = relations.cover
        .slots({
          path: ['media.albumCover', data.coverArtDirectory, data.coverArtFileExtension],
          alt: language.$('misc.alt.trackCover')
        });
    } else {
      content.cover = null;
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
            formatContributions('releaseInfo.by', sec.releaseInfo.artistContributionLinks),
            formatContributions('releaseInfo.coverArtBy', sec.releaseInfo.coverArtistContributionLinks),
            formatContributions('releaseInfo.wallpaperArtBy', sec.releaseInfo.wallpaperArtistContributionLinks),
            formatContributions('releaseInfo.bannerArtBy', sec.releaseInfo.bannerArtistContributionLinks),

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

        sec.listen &&
          html.tag('p',
            language.$('releaseInfo.listenOn', {
              links: language.formatDisjunctionList(sec.listen.externalLinks),
            })),

        html.tag('p',
          {
            [html.onlyIfContent]: true,
            [html.joinChildren]: html.tag('br'),
          },
          [
            sec.extra.additionalFilesShortcut,

            sec.extra.galleryLink && sec.extra.commentaryLink &&
              language.$('releaseInfo.viewGalleryOrCommentary', {
                gallery:
                  sec.extra.galleryLink
                    .slot('content', language.$('releaseInfo.viewGalleryOrCommentary.gallery')),
                commentary:
                  sec.extra.commentaryLink
                    .slot('content', language.$('releaseInfo.viewGalleryOrCommentary.commentary')),
              }),

            sec.extra.galleryLink && !sec.extra.commentaryLink &&
              language.$('releaseInfo.viewGallery', {
                link:
                  sec.extra.galleryLink
                    .slot('content', language.$('releaseInfo.viewGallery.link')),
              }),

            !sec.extra.galleryLink && sec.extra.commentaryLink &&
              language.$('releaseInfo.viewCommentary', {
                link:
                  sec.extra.commentaryLink
                    .slot('content', language.$('releaseInfo.viewCommentary.link')),
              }),
          ]),

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

        sec.additionalFiles && [
          sec.additionalFiles.heading
            .slots({
              id: 'additional-files',
              title:
                language.$('releaseInfo.additionalFiles.heading', {
                  additionalFiles:
                    language.countAdditionalFiles(data.numAdditionalFiles, {unit: true}),
                }),
            }),

          sec.additionalFiles.additionalFilesList,
        ],

        sec.artistCommentary && [
          sec.artistCommentary.heading
            .slots({
              id: 'artist-commentary',
              title: language.$('releaseInfo.artistCommentary')
            }),

          html.tag('blockquote',
            sec.artistCommentary.content
              .slot('mode', 'multiline')),
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

  secondaryNav: generateAlbumSecondaryNav(album, null, {
    getLinkThemeString,
    html,
    language,
    link,
  }),
*/
