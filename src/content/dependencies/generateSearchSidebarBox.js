export default {
  contentDependencies: ['generatePageSidebarBox'],
  extraDependencies: ['html'],

  relations: (relation) => ({
    sidebarBox:
      relation('generatePageSidebarBox'),
  }),

  generate: (relations, {html}) =>
    relations.sidebarBox.slots({
      attributes: {class: 'wiki-search-sidebar-box'},
      collapsible: false,

      content: [
        html.tag('input', {class: 'wiki-search-input'},
          {placeholder: `Search for anything`},
          {type: 'search'})
      ],
    }),
};
