export default {
  relations(relation, album) {
    if (!album.hasBannerArt) {
      return {};
    }

    return {
      banner:
        relation('generateBanner'),

      colorAttribute:
        relation('generateColorStyleAttribute', album.color),
    };
  },

  data(album) {
    if (!album.hasBannerArt) {
      return {};
    }

    return {
      path: album.bannerArtwork.path,
      dimensions: album.bannerArtwork.dimensions,
    };
  },

  slots: {
    mode: {
      validate: v => v.is('main', 'sub'),
      default: 'main',
    },
  },

  generate(data, relations, slots, {html, language}) {
    if (!relations.banner) {
      return html.blank();
    }

    return relations.banner.slots({
      path: data.path,
      dimensions: data.dimensions,
      alt: language.$('misc.alt.albumBanner'),

      attributes: [
        slots.mode === 'sub' && [
          {class: ['dim', 'short']},
          relations.colorAttribute.slot('context', 'banner'),
        ],
      ],
    });
  },
};
