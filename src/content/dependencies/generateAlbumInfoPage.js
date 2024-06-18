export default {
  contentDependencies: [
    'generateAlbumAdditionalFilesList',
    'generateAlbumBanner',
    'generateAlbumCoverArtwork',
    'generateAlbumNavAccent',
    'generateAlbumReleaseInfo',
    'generateAlbumSecondaryNav',
    'generateAlbumSidebar',
    'generateAlbumSocialEmbed',
    'generateAlbumStyleRules',
    'generateAlbumTrackList',
    'generateCommentarySection',
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

    cover:
      (album.hasCoverArt
        ? relation('generateAlbumCoverArtwork', album)
        : null),

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
      (album.commentary || album.tracks.some(t => t.commentary)
        ? relation('linkAlbumCommentary', album)
        : null),

    trackList:
      relation('generateAlbumTrackList', album),

    additionalFilesList:
      relation('generateAlbumAdditionalFilesList',
        album,
        album.additionalFiles),

    artistCommentarySection:
      relation('generateCommentarySection', album.commentary),
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

        cover:
          relations.cover
            ?.slots({
              alt: language.$('misc.alt.albumCover'),
            })
            ?? null,

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

          relations.artistCommentarySection,
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
