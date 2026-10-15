export default {
  relations: (relation, album) => ({
    banner:
      relation('generateBanner'),

    colorAttribute:
      relation('generateColorStyleAttribute', album.color),
  }),

  data: (album) => ({
    path:
      (album.hasBannerArt
        ? album.bannerArtwork.path
        : null),

    dimensions:
      (album.hasBannerArt
        ? album.bannerArtwork.dimensions
        : null),

    color:
      album.color,
  }),

  generate: (data, relations, {language}) =>
    relations.banner.slots({
      path: data.path,
      dimensions: data.dimensions,
      color: data.color,
      alt: language.$('misc.alt.albumBanner'),
    }),
};
