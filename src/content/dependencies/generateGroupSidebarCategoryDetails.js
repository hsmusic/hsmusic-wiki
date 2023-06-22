import {empty} from '../../util/sugar.js';

export default {
  contentDependencies: [
    'generateColorStyleVariables',
    'linkGroup',
    'linkGroupGallery',
  ],

  extraDependencies: ['html', 'language'],

  relations(relation, category) {
    return {
      colorVariables: relation('generateColorStyleVariables', category.color),

      // Which of these is used depends on the currentExtra slot, so all
      // available links are included here.
      groupLinks: category.groups.map(group => {
        const links = {};
        links.info = relation('linkGroup', group);

        if (!empty(group.albums)) {
          links.gallery = relation('linkGroupGallery', group);
        }

        return links;
      }),
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

  generate(data, relations, slots, {html, language}) {
    return html.tag('details',
      {
        open: data.isCurrentCategory,
        class: data.isCurrentCategory && 'current',
      },
      [
        html.tag('summary',
          {style: relations.colorVariables},
          html.tag('span',
            language.$('groupSidebar.groupList.category', {
              category:
                html.tag('span', {class: 'group-name'},
                  data.name),
            }))),

        html.tag('ul',
          relations.groupLinks.map((links, index) =>
            html.tag('li',
              {class: index === data.currentGroupIndex && 'current'},
              language.$('groupSidebar.groupList.item', {
                group:
                  links[slots.currentExtra ?? 'info'] ??
                  links.info,
              })))),
      ]);
  },
};
