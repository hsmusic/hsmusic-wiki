import {accumulateSum, empty} from '../../util/sugar.js';

export default {
  contentDependencies: [
    'generateContributionLinks',
  ],

  extraDependencies: [
    'html',
    'language',
  ],

  relations(relation, album) {
    const relations = {};

    const contributionLinksRelation = contribs =>
      relation('generateContributionLinks', contribs, {
        showContrib: true,
        showIcons: true,
      })

    relations.artistLinks =
      contributionLinksRelation(album.artistContribs);

    relations.coverArtistLinks =
      contributionLinksRelation(album.coverArtistContribs);

    relations.wallpaperArtistLinks =
      contributionLinksRelation(album.wallpaperArtistContribs);

    relations.bannerArtistLinks =
      contributionLinksRelation(album.bannerArtistContribs);

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

    return data;
  },

  generate(data, relations, {
    html,
    language,
  }) {
    const content = {};

    content.main = {
      headingMode: 'sticky',
      content: [
        html.tag('p',
          {
            [html.onlyIfContent]: true,
            [html.joinChildren]: '<br>',
          },
          [
            !empty(relations.artistLinks) &&
              language.$('releaseInfo.by', {
                artists: relations.artistLinks,
              }),

            !empty(relations.coverArtistLinks) &&
              language.$('releaseInfo.coverArtBy', {
                artists: relations.coverArtistLinks,
              }),

            !empty(relations.wallpaperArtistLinks) &&
              language.$('releaseInfo.wallpaperArtBy', {
                artists: relations.wallpaperArtistLinks,
              }),

            !empty(relations.bannerArtistLinks) &&
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

        /*
        html.tag('p',
          {
            [html.onlyIfContent]: true,
            [html.joinChildren]: '<br>',
          },
          [
            hasAdditionalFiles &&
              generateAdditionalFilesShortcut(album.additionalFiles),

            checkGalleryPage(album) &&
              language.$('releaseInfo.viewGallery', {
                link: link.albumGallery(album, {
                  text: language.$('releaseInfo.viewGallery.link'),
                }),
              }),

            checkCommentaryPage(album) &&
              language.$('releaseInfo.viewCommentary', {
                link: link.albumCommentary(album, {
                  text: language.$('releaseInfo.viewCommentary.link'),
                }),
              }),
          ]),

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

        ...html.fragment(
          hasAdditionalFiles && [
            generateContentHeading({
              id: 'additional-files',
              title: language.$('releaseInfo.additionalFiles.heading', {
                additionalFiles: language.countAdditionalFiles(numAdditionalFiles, {
                  unit: true,
                }),
              }),
            }),

            generateAlbumAdditionalFilesList(album, album.additionalFiles, {
              generateAdditionalFilesList,
              getSizeOfAdditionalFile,
              link,
              urls,
            }),
          ]),

        ...html.fragment(
          album.commentary && [
            generateContentHeading({
              id: 'artist-commentary',
              title: language.$('releaseInfo.artistCommentary'),
            }),

            html.tag('blockquote', transformMultiline(album.commentary)),
          ])
        */
      ]
    };

    return content;
  },
};
