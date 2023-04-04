import {accumulateSum, empty} from '../../util/sugar.js';

export default {
  contentDependencies: [
    'generateAdditionalFilesShortcut',
    'generateAlbumAdditionalFilesList',
    'generateContributionLinks',
    'generateContentHeading',
    'linkAlbumCommentary',
    'linkAlbumGallery',
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

        /*
          !empty(album.urls) &&
            html.tag('p',
              language.$('releaseInfo.listenOn', {
                links: language.formatDisjunctionList(
                  album.urls.map(url => fancifyURL(url, {album: true}))
                ),
              })),

          displayTrackSections &&
          !empty(album.trackSections) &&
            html.tag('dl',
              {class: 'album-group-list'},
              album.trackSections.flatMap(({
                name,
                startIndex,
                tracks,
              }) => [
                html.tag('dt',
                  {class: ['content-heading']},
                  language.$('trackList.section.withDuration', {
                    duration: language.formatDuration(getTotalDuration(tracks), {
                      approximate: tracks.length > 1,
                    }),
                    section: name,
                  })),
                html.tag('dd',
                  html.tag(listTag,
                    listTag === 'ol' ? {start: startIndex + 1} : {},
                    tracks.map(trackToListItem))),
              ])),

          !displayTrackSections &&
          !empty(album.tracks) &&
            html.tag(listTag,
              album.tracks.map(trackToListItem)),

          html.tag('p',
            {
              [html.onlyIfContent]: true,
              [html.joinChildren]: '<br>',
            },
            [
              album.dateAddedToWiki &&
                language.$('releaseInfo.addedToWiki', {
                  date: language.formatDate(
                    album.dateAddedToWiki
                  ),
                })
            ]),
        */

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
