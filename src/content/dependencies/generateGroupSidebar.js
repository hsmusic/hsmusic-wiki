export default {
  contentDependencies: ['generateGroupSidebarCategoryDetails'],
  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({groupCategoryData}) {
    return {groupCategoryData};
  },

  relations(relation, sprawl, group) {
    return {
      categoryDetails:
        sprawl.groupCategoryData.map(category =>
          relation('generateGroupSidebarCategoryDetails', category, group)),
    };
  },

  slots: {
    currentExtra: {
      validate: v => v.is('gallery'),
    },
  },

  generate(relations, slots, {html, language}) {
    return {
      leftSidebarClass: 'category-map-sidebar-box',
      leftSidebarContent: [
        html.tag('h1',
          language.$('groupSidebar.title')),

        relations.categoryDetails
          .map(details =>
            details.slot('currentExtra', slots.currentExtra)),
      ],
    };
  },
};
