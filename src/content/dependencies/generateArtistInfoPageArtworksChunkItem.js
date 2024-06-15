export default {
  contentDependencies: [
    'generateArtistInfoPageChunkItem',
    'generateArtistInfoPageOtherArtistLinks',
    'linkTrack',
  ],

  extraDependencies: ['html', 'language'],

  query: (contrib) => ({
    kind:
      (contrib.isBannerArtistContribution
        ? 'banner'
     : contrib.isWallpaperArtistContribution
        ? 'wallpaper'
     : contrib.isForAlbum
        ? 'album-cover'
        : 'track-cover'),
  }),

  relations: (relation, query, contrib) => ({
    template:
      relation('generateArtistInfoPageChunkItem'),

    trackLink:
      (query.kind === 'track-cover'
        ? relation('linkTrack', contrib.thing)
        : null),

    otherArtistLinks:
      relation('generateArtistInfoPageOtherArtistLinks', [contrib]),
  }),

  data: (query, contrib) => ({
    kind:
      query.kind,

    annotation:
      contrib.annotation,
  }),

  generate: (data, relations, {html, language}) =>
    relations.template.slots({
      otherArtistLinks: relations.otherArtistLinks,

      annotation: data.annotation,

      content:
        language.encapsulate('artistPage.creditList.entry', capsule =>
          (data.kind === 'track-cover'
            ? language.$(capsule, 'track', {
                track: relations.trackLink,
              })
            : html.tag('i',
                language.encapsulate(capsule, 'album', capsule =>
                  (data.kind === 'wallpaper'
                    ? language.$(capsule, 'wallpaperArt')
                 : data.kind === 'banner'
                    ? language.$(capsule, 'bannerArt')
                    : language.$(capsule, 'coverArt')))))),
    }),
};
