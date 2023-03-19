export default {
  contentDependencies: [
    'generateAlbumInfoPageContent',
    'generateAlbumSocialEmbed',
    'generateAlbumStyleRules',
    'generateColorStyleRules',
  ],

  extraDependencies: [
    'language',
  ],

  relations(relation, album) {
    const relations = {};

    relations.socialEmbed = relation('generateAlbumSocialEmbed', album);
    relations.albumStyleRules = relation('generateAlbumStyleRules', album);
    relations.colorStyleRules = relation('generateColorStyleRules', album.color);

    return relations;
  },

  data(album) {
    const data = {};

    return data;
  },

  generate(data, relations, {
    language,
  }) {
    const page = {};

    page.title = language.$('albumPage.title', {album: data.name});

    page.themeColor = data.color;

    page.styleRules = [
      relations.albumStyleRules,
      relations.colorStyleRules,
    ];

    page.socialEmbed = relations.socialEmbed;

    return page;
  },
};
