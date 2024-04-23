import {stitchArrays} from '#sugar';

export default {
  extraDependencies: ['html', 'language'],

  slots: {
    scopes: {
      validate: v => v.strictArrayOf(v.isStringNonEmpty),
    },

    contents: {
      validate: v => v.strictArrayOf(v.isHTML),
    },

    open: {
      type: 'boolean',
      default: true,
    },
  },

  generate: (slots, {html, language}) =>
    html.tag('details', {class: 'scoped-chronology-switcher'},
      slots.open &&
        {open: true},

      [
        html.tag('summary',
          {class: 'underline-white'},

          html.tag('span',
            language.$('trackPage.nav.chronology.scope.title', {
              scope:
                slots.scopes.map((scope, index) =>
                  html.tag('a', {class: 'switcher-link'},
                    {href: '#'},

                    (index === 0
                      ? {style: 'display: inline'}
                      : {style: 'display: none'}),

                    language.$('trackPage.nav.chronology.scope', scope))),
            }))),

        stitchArrays({
          scope: slots.scopes,
          content: slots.contents,
        }).map(({scope, content}, index) =>
            html.tag('div', {class: 'scope-' + scope},
              (index === 0
                ? {style: 'display: block'}
                : {style: 'display: none'}),

              content)),
      ]),
};
