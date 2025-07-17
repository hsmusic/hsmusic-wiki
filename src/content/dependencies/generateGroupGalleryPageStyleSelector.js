import {unique} from '#sugar';

export default {
  extraDependencies: ['html', 'language'],

  query: (group) => ({
    styles:
      unique(group.albums.map(album => album.style)),
  }),

  data: (query, group) => ({
    albums:
      group.albums.length,

    styles:
      query.styles,
  }),

  generate: (data, {html, language}) =>
    language.encapsulate('groupGalleryPage', pageCapsule =>
      (data.styles.length <= 1
        ? html.blank()
        : html.tag('p', {class: 'gallery-style-selector'},
            {class: ['drop', 'shiny']},

            language.encapsulate(pageCapsule, 'albumStyleSwitcher', capsule => [
              html.tag('span',
                language.$(capsule)),

              html.tag('br'),

              html.tag('span', {class: 'styles'},
                data.styles.map(style =>
                  html.tag('label', {'data-style': style}, [
                    html.tag('input', {type: 'checkbox'},
                      {checked: true}),

                    html.tag('span',
                      language.$(capsule, style)),
                  ]))),

              html.tag('br'),

              html.tag('span', {class: ['count', 'all']},
                language.$(capsule, 'count.all', {
                  total: data.albums,
                })),

              html.tag('span', {class: ['count', 'filtered']},
                {style: 'display: none'},

                language.$(capsule, 'count.filtered', {
                  count: html.tag('span'),
                  total: data.albums,
                })),

              html.tag('span', {class: ['count', 'none']},
                {style: 'display: none'},

                language.$(capsule, 'count.none')),
            ])))),
};
