export default {
  contentDependencies: [
    'generateColorStyleAttribute',
    'generateWikiHomepageAlbumsRow',
  ],

  extraDependencies: ['html'],

  relations: (relation, homepageSection) => ({
    colorStyle:
      relation('generateColorStyleAttribute', homepageSection.color),

    rows:
      homepageSection.rows.map(row =>
        (row.type === 'albums'
          ? relation('generateWikiHomepageAlbumsRow', row)
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
