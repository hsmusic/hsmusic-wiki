export default {
  contentDependencies: [
    'generateAlbumInfoPageContent',
    'generateAlbumSocialEmbed',
    'generateAlbumStyleRules',
    'generateColorStyleRules',
    'generatePageLayout',
  ],

  extraDependencies: [
    'language',
  ],

  relations(relation, album) {
    const relations = {};

    relations.layout = relation('generatePageLayout');

    relations.content = relation('generateAlbumInfoPageContent', album);
    relations.socialEmbed = relation('generateAlbumSocialEmbed', album);
    relations.albumStyleRules = relation('generateAlbumStyleRules', album);
    relations.colorStyleRules = relation('generateColorStyleRules', album.color);

    return relations;
  },

  data(album) {
    const data = {};

    data.name = album.name;
    data.color = album.color;

    return data;
  },

  generate(data, relations, {
    language,
  }) {
    // page.themeColor = data.color;

    return relations.layout
      .slots({
        title: language.$('albumPage.title', {album: data.name}),
        styleRules: [
          relations.albumStyleRules,
          relations.colorStyleRules,
        ],

        cover: relations.content.cover,
        mainContent: relations.content.main.content,

        // socialEmbed: relations.socialEmbed,
      });
  },
};
