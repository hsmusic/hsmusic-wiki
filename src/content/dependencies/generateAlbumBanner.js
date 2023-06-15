export default {
  contentDependencies: ['generatePageBanner'],
  extraDependencies: ['html', 'language'],

  relations(relation, album) {
    if (!album.hasBannerArt) {
      return {};
    }

    return {
      banner: relation('generatePageBanner'),
    };
  },

  data(album) {
    if (!album.hasBannerArt) {
      return {};
    }

    return {
      path: ['media.albumBanner', album.directory, album.bannerFileExtension],
      dimensions: album.bannerDimensions,
    };
  },

  generate(data, relations, {html, language}) {
    if (!relations.banner) {
      return html.blank();
    }

    return relations.banner.slots({
      path: data.path,
      dimensions: data.dimensions,
      alt: language.$('misc.alt.albumBanner'),
    });
  },
};
