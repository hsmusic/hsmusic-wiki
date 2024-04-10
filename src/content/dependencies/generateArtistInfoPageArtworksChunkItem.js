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
        (data.kind === 'track-cover'
          ? language.$('artistPage.creditList.entry.track', {
              track: relations.trackLink,
            })
          : html.tag('i',
              language.$('artistPage.creditList.entry.album',
                {
                  'wallpaper': 'wallpaperArt',
                  'banner': 'bannerArt',
                  'album-cover': 'coverArt',
                }[data.kind]))),
    }),
};
