export default {
  contentDependencies: [
    'generateGroupSidebarCategoryDetails',
    'generatePageSidebar',
    'generatePageSidebarBox',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({groupCategoryData}) => ({groupCategoryData}),

  relations: (relation, sprawl, group) => ({
    sidebar:
      relation('generatePageSidebar'),

    sidebarBox:
      relation('generatePageSidebarBox'),

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
      boxes: [
        relations.sidebarBox.slots({
          attributes: {class: 'category-map-sidebar-box'},
          content: [
            html.tag('h1',
              language.$('groupSidebar.title')),

            relations.categoryDetails
              .map(details =>
                details.slot('currentExtra', slots.currentExtra)),
          ],
        }),
      ],
    }),
};
