import {empty, stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateColorStyleVariables',
    'linkGroup',
    'linkGroupGallery',
  ],

  extraDependencies: ['html', 'language'],

  relations(relation, category) {
    return {
      colorVariables:
        relation('generateColorStyleVariables'),

      groupInfoLinks:
        category.groups.map(group =>
          relation('linkGroup', group)),

      groupGalleryLinks:
        category.groups.map(group =>
          (empty(group.albums)
            ? null
            : relation('linkGroupGallery', group))),
    };
  },

  data(category, group) {
    const data = {};

    data.name = category.name;
    data.color = category.color;

    data.isCurrentCategory = category === group.category;

    if (data.isCurrentCategory) {
      data.currentGroupIndex = category.groups.indexOf(group);
    }

    return data;
  },

  slots: {
    currentExtra: {
      validate: v => v.is('gallery'),
    },
  },

  generate(data, relations, slots, {html, language}) {
    return html.tag('details',
      {
        open: data.isCurrentCategory,
        class: data.isCurrentCategory && 'current',
      },
      [
        html.tag('summary',
          {style: relations.colorVariables.slot('color', data.color).content},
          html.tag('span',
            language.$('groupSidebar.groupList.category', {
              category:
                html.tag('span', {class: 'group-name'},
                  data.name),
            }))),

        html.tag('ul',
          stitchArrays(({
            infoLink: relations.groupInfoLinks,
            galleryLink: relations.groupGalleryLinks,
          })).map(({infoLink, galleryLink}, index) =>
                html.tag('li',
                  {class: index === data.currentGroupIndex && 'current'},
                  language.$('groupSidebar.groupList.item', {
                    group:
                      (slots.currentExtra === 'gallery'
                        ? galleryLink ?? infoLink
                        : infoLink),
                  })))),
      ]);
  },
};
