import {accumulateSum, empty} from '../../util/sugar.js';

export default {
  contentDependencies: [
    'generateAdditionalFilesShortcut',
    'generateAlbumAdditionalFilesList',
    'generateAlbumTrackList',
    'generateContributionLinks',
    'generateContentHeading',
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

    if (!empty(album.urls)) {
      relations.externalLinks =
        album.urls.map(url =>
          relation('linkExternal', url, {type: 'album'}));
    }

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
