export default {
  contentDependencies: ['generatePageSidebarBox'],
  extraDependencies: ['html', 'language'],

  relations: (relation) => ({
    sidebarBox:
      relation('generatePageSidebarBox'),
  }),

  generate: (relations, {html, language}) =>
    relations.sidebarBox.slots({
      attributes: {class: 'wiki-search-sidebar-box'},
      collapsible: false,

      content: [
        html.tag('input', {class: 'wiki-search-input'},
          {
            placeholder:
              language.$('misc.search.placeholder').toString(),
          },
          {type: 'search'}),

        html.tag('template', {class: 'wiki-search-no-results-string'},
          language.$('misc.search.noResults')),
      ],
    }),
};
