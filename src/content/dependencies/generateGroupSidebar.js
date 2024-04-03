export default {
  contentDependencies: [
    'generateGroupSidebarCategoryDetails',
    'generatePageSidebar',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({groupCategoryData}) => ({groupCategoryData}),

  relations: (relation, sprawl, group) => ({
    sidebar:
      relation('generatePageSidebar'),

    categoryDetails:
      sprawl.groupCategoryData.map(category =>
        relation('generateGroupSidebarCategoryDetails', category, group)),
  }),

  slots: {
    currentExtra: {
      validate: v => v.is('gallery'),
    },
  },

  generate: (relations, slots, {html, language}) =>
    relations.sidebar.slots({
      attributes: {class: 'category-map-sidebar-box'},

      content: [
        html.tag('h1',
          language.$('groupSidebar.title')),

        relations.categoryDetails
          .map(details =>
            details.slot('currentExtra', slots.currentExtra)),
      ],
    }),
};
