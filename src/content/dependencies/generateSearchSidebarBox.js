export default {
  contentDependencies: ['generatePageSidebarBox'],
  extraDependencies: ['html', 'language'],

  relations: (relation) => ({
    sidebarBox:
      relation('generatePageSidebarBox'),
  }),

  generate: (relations, {html, language}) =>
    language.encapsulate('misc.search', capsule =>
      relations.sidebarBox.slots({
        attributes: {class: 'wiki-search-sidebar-box'},
        collapsible: false,

        content: [
          html.tag('label', {class: 'wiki-search-label'},
            html.tag('input', {class: 'wiki-search-input'},
              {type: 'search'},

              {
                placeholder:
                  language.$(capsule, 'placeholder').toString(),
              })),

          html.tag('template', {class: 'wiki-search-preparing-string'},
            language.$(capsule, 'preparing')),

          html.tag('template', {class: 'wiki-search-loading-data-string'},
            language.$(capsule, 'loadingData')),

          html.tag('template', {class: 'wiki-search-searching-string'},
            language.$(capsule, 'searching')),

          html.tag('template', {class: 'wiki-search-failed-string'},
            language.$(capsule, 'failed')),

          html.tag('template', {class: 'wiki-search-no-results-string'},
            language.$(capsule, 'noResults')),

          html.tag('template', {class: 'wiki-search-current-result-string'},
            language.$(capsule, 'currentResult')),

          html.tag('template', {class: 'wiki-search-end-search-string'},
            language.$(capsule, 'endSearch')),

          language.encapsulate(capsule, 'resultKind', capsule => [
            html.tag('template', {class: 'wiki-search-album-result-kind-string'},
              language.$(capsule, 'album')),

            html.tag('template', {class: 'wiki-search-artist-result-kind-string'},
              language.$(capsule, 'artist')),

            html.tag('template', {class: 'wiki-search-group-result-kind-string'},
              language.$(capsule, 'group')),

            html.tag('template', {class: 'wiki-search-tag-result-kind-string'},
              language.$(capsule, 'artTag')),
          ]),
        ],
      })),
};
