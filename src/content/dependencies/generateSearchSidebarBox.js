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

        html.tag('template', {class: 'wiki-search-preparing-string'},
          language.$('misc.search.preparing')),

        html.tag('template', {class: 'wiki-search-loading-data-string'},
          language.$('misc.search.loadingData')),

        html.tag('template', {class: 'wiki-search-searching-string'},
          language.$('misc.search.searching')),

        html.tag('template', {class: 'wiki-search-no-results-string'},
          language.$('misc.search.noResults')),

        html.tag('template', {class: 'wiki-search-current-result-string'},
          language.$('misc.search.currentResult')),

        html.tag('template', {class: 'wiki-search-end-search-string'},
          language.$('misc.search.endSearch')),

        html.tag('template', {class: 'wiki-search-album-result-kind-string'},
          language.$('misc.search.resultKind.album')),

        html.tag('template', {class: 'wiki-search-artist-result-kind-string'},
          language.$('misc.search.resultKind.artist')),

        html.tag('template', {class: 'wiki-search-group-result-kind-string'},
          language.$('misc.search.resultKind.group')),
      ],
    }),
};
