import {empty, stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateColorStyleAttribute',
    'linkGroup',
    'linkGroupGallery',
  ],

  extraDependencies: ['html', 'language'],

  relations(relation, category) {
    return {
      colorStyle:
        relation('generateColorStyleAttribute', category.color),

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

  generate: (data, relations, slots, {html, language}) =>
    language.encapsulate('groupSidebar.groupList', capsule =>
      html.tag('details',
        data.isCurrentCategory &&
          {class: 'current', open: true},

        [
          html.tag('summary',
            relations.colorStyle,

            html.tag('span',
              language.$(capsule, 'category', {
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
                    index === data.currentGroupIndex &&
                      {class: 'current'},

                    language.$(capsule, 'item', {
                      group:
                        (slots.currentExtra === 'gallery'
                          ? galleryLink ?? infoLink
                          : infoLink),
                    })))),
        ])),
};
