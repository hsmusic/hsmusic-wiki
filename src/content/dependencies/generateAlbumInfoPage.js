import {empty} from '#sugar';

export default {
  contentDependencies: [
    'generateAdditionalFilesList',
    'generateAdditionalNamesBox',
    'generateAlbumArtworkColumn',
    'generateAlbumBanner',
    'generateAlbumNavAccent',
    'generateAlbumReleaseInfo',
    'generateAlbumSecondaryNav',
    'generateAlbumSidebar',
    'generateAlbumSocialEmbed',
    'generateAlbumStyleRules',
    'generateAlbumTrackList',
    'generateCommentaryEntry',
    'generateContentHeading',
    'generatePageLayout',
    'linkAlbumCommentary',
    'linkAlbumGallery',
  ],

  extraDependencies: ['html', 'language'],

  relations: (relation, album) => ({
    layout:
      relation('generatePageLayout'),

    albumStyleRules:
      relation('generateAlbumStyleRules', album, null),

    socialEmbed:
      relation('generateAlbumSocialEmbed', album),

    albumNavAccent:
      relation('generateAlbumNavAccent', album, null),

    secondaryNav:
      relation('generateAlbumSecondaryNav', album),

    sidebar:
      relation('generateAlbumSidebar', album, null),

    additionalNamesBox:
      relation('generateAdditionalNamesBox', album.additionalNames),

    artworkColumn:
      relation('generateAlbumArtworkColumn', album),

    banner:
      (album.hasBannerArt
        ? relation('generateAlbumBanner', album)
        : null),

    contentHeading:
      relation('generateContentHeading'),

    releaseInfo:
      relation('generateAlbumReleaseInfo', album),

    galleryLink:
      (album.tracks.some(t => t.hasUniqueCoverArt)
        ? relation('linkAlbumGallery', album)
        : null),

    commentaryLink:
      ([album, ...album.tracks].some(({commentary}) => !empty(commentary))
        ? relation('linkAlbumCommentary', album)
        : null),

    trackList:
      relation('generateAlbumTrackList', album),

    additionalFilesList:
      relation('generateAdditionalFilesList', album.additionalFiles),

    artistCommentaryEntries:
      album.commentary
        .map(entry => relation('generateCommentaryEntry', entry)),

    creditSourceEntries:
      album.creditSources
        .map(entry => relation('generateCommentaryEntry', entry)),
  }),

  data: (album) => ({
    name:
      album.name,

    color:
      album.color,

    dateAddedToWiki:
      album.dateAddedToWiki,
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('albumPage', pageCapsule =>
      relations.layout.slots({
        title:
          language.$(pageCapsule, 'title', {
            album: data.name,
          }),

        color: data.color,
        headingMode: 'sticky',
        styleRules: [relations.albumStyleRules],

        additionalNames: relations.additionalNamesBox,

        artworkColumnContent:
          relations.artworkColumn,

        mainContent: [
          relations.releaseInfo,

          html.tag('p',
            {[html.onlyIfContent]: true},
            {[html.joinChildren]: html.tag('br')},

            language.encapsulate('releaseInfo', capsule => [
              !html.isBlank(relations.additionalFilesList) &&
                language.$(capsule, 'additionalFiles.shortcut', {
                  link: html.tag('a',
                    {href: '#additional-files'},
                    language.$(capsule, 'additionalFiles.shortcut.link')),
                }),

              (relations.galleryLink && relations.commentaryLink
                ? language.encapsulate(capsule, 'viewGalleryOrCommentary', capsule =>
                    language.$(capsule, {
                      gallery:
                        relations.galleryLink
                          .slot('content', language.$(capsule, 'gallery')),

                      commentary:
                        relations.commentaryLink
                          .slot('content', language.$(capsule, 'commentary')),
                    }))

             : relations.galleryLink
                ? language.encapsulate(capsule, 'viewGallery', capsule =>
                    language.$(capsule, {
                      link:
                        relations.galleryLink
                          .slot('content', language.$(capsule, 'link')),
                    }))

             : relations.commentaryLink
                ? language.encapsulate(capsule, 'viewCommentary', capsule =>
                    language.$(capsule, {
                      link:
                        relations.commentaryLink
                          .slot('content', language.$(capsule, 'link')),
                    }))

                : html.blank()),

              !html.isBlank(relations.creditSourceEntries) &&
                language.encapsulate(capsule, 'readCreditSources', capsule =>
                  language.$(capsule, {
                    link:
                      html.tag('a',
                        {href: '#credit-sources'},
                        language.$(capsule, 'link')),
                  })),
            ])),

          relations.trackList,

          html.tag('p',
            {[html.onlyIfContent]: true},
            {[html.joinChildren]: html.tag('br')},

            language.encapsulate('releaseInfo', capsule => [
              language.$(capsule, 'addedToWiki', {
                [language.onlyIfOptions]: ['date'],
                date: language.formatDate(data.dateAddedToWiki),
              }),
            ])),

          language.encapsulate('releaseInfo.additionalFiles', capsule =>
            html.tags([
              relations.contentHeading.clone()
                .slots({
                  attributes: {id: 'additional-files'},
                  title: language.$(capsule, 'heading'),
                }),

              relations.additionalFilesList,
            ])),

          html.tags([
            relations.contentHeading.clone()
              .slots({
                attributes: {id: 'artist-commentary'},
                title: language.$('misc.artistCommentary'),
              }),

            relations.artistCommentaryEntries,
          ]),

          html.tags([
            relations.contentHeading.clone()
              .slots({
                attributes: {id: 'credit-sources'},
                title: language.$('misc.creditSources'),
              }),

            relations.creditSourceEntries,
          ]),
        ],

        navLinkStyle: 'hierarchical',
        navLinks: [
          {auto: 'home'},
          {
            auto: 'current',
            accent:
              relations.albumNavAccent.slots({
                showTrackNavigation: true,
                showExtraLinks: true,
              }),
          },
        ],

        banner: relations.banner ?? null,
        bannerPosition: 'top',

        secondaryNav: relations.secondaryNav,

        leftSidebar: relations.sidebar,

        socialEmbed: relations.socialEmbed,
      })),
};
