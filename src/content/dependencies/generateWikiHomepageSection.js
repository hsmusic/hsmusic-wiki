export default {
  contentDependencies: [
    'generateColorStyleAttribute',
    'generateWikiHomepageActionsRow',
    'generateWikiHomepageAlbumCarouselRow',
    'generateWikiHomepageAlbumGridRow',
  ],

  extraDependencies: ['html'],

  relations: (relation, homepageSection) => ({
    colorStyle:
      relation('generateColorStyleAttribute', homepageSection.color),

    rows:
      homepageSection.rows.map(row =>
        (row.type === 'actions'
          ? relation('generateWikiHomepageActionsRow', row)
       : row.type === 'album carousel'
          ? relation('generateWikiHomepageAlbumCarouselRow', row)
       : row.type === 'album grid'
          ? relation('generateWikiHomepageAlbumGridRow', row)
          : null)),
  }),

  data: (homepageSection) => ({
    name:
      homepageSection.name,
  }),

  generate: (data, relations, {html}) =>
    html.tag('section',
      relations.colorStyle,

      [
        html.tag('h2', data.name),
        relations.rows,
      ]),
};
