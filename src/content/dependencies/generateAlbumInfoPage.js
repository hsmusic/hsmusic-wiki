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
    'generateAlbumChronologyLinks',
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

    chronologyLinks:
      relation('generateAlbumChronologyLinks', album),

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
    relations.layout.slots({
      title: language.$('albumPage.title', {album: data.name}),
      headingMode: 'sticky',

      color: data.color,
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

          [
            !html.isBlank(relations.additionalFilesList) &&
              language.$('releaseInfo.additionalFiles.shortcut', {
                link: html.tag('a',
                  {href: '#additional-files'},
                  language.$('releaseInfo.additionalFiles.shortcut.link')),
              }),

            relations.galleryLink && relations.commentaryLink &&
              language.$('releaseInfo.viewGalleryOrCommentary', {
                gallery:
                  relations.galleryLink
                    .slot('content', language.$('releaseInfo.viewGalleryOrCommentary.gallery')),
                commentary:
                  relations.commentaryLink
                    .slot('content', language.$('releaseInfo.viewGalleryOrCommentary.commentary')),
              }),

            relations.galleryLink && !relations.commentaryLink &&
              language.$('releaseInfo.viewGallery', {
                link:
                  relations.galleryLink
                    .slot('content', language.$('releaseInfo.viewGallery.link')),
              }),

            !relations.galleryLink && relations.commentaryLink &&
              language.$('releaseInfo.viewCommentary', {
                link:
                  relations.commentaryLink
                    .slot('content', language.$('releaseInfo.viewCommentary.link')),
              }),
          ]),

        relations.trackList,

        html.tag('p',
          {[html.onlyIfContent]: true},
          {[html.joinChildren]: html.tag('br')},

          [
            language.$('releaseInfo.addedToWiki', {
              [language.onlyIfOptions]: ['date'],
              date: language.formatDate(data.dateAddedToWiki),
            }),
          ]),

        html.tags([
          relations.contentHeading.clone()
            .slots({
              attributes: {id: 'additional-files'},
              title: language.$('releaseInfo.additionalFiles.heading'),
            }),

          relations.additionalFilesList,
        ]),

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

      navContent:
        relations.chronologyLinks,

      banner: relations.banner ?? null,
      bannerPosition: 'top',

      secondaryNav: relations.secondaryNav,

      leftSidebar: relations.sidebar,

      socialEmbed: relations.socialEmbed,
    }),
};
