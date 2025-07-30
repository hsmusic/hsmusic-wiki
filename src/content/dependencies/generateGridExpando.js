export default {
  extraDependencies: ['html', 'language'],

  slots: {
    caption: {type: 'html', mutable: false},
  },

  generate: (slots, {html, language}) =>
    language.encapsulate('misc.coverGrid', capsule =>
      html.tag('div', {class: 'grid-expando'},
        {[html.onlyIfSiblings]: true},

        html.tag('p', {class: 'grid-expando-content'},
          {[html.joinChildren]: html.tag('br')},

          [
            html.tag('span', {class: 'grid-caption'},
              slots.caption),

            !html.isBlank(slots.contentBelowCut) &&
              language.$(capsule, 'expandCollapseCue', {
                cue:
                  html.tag('a', {class: 'grid-expando-toggle'},
                    {href: '#'},

                    {[html.joinChildren]: ''},
                    {[html.noEdgeWhitespace]: true},

                    [
                      html.tag('span', {class: 'grid-expand-cue'},
                        language.$(capsule, 'expand')),

                      html.tag('span', {class: 'grid-collapse-cue'},
                        {style: 'display: none'},
                        language.$(capsule, 'collapse')),
                    ]),
              }),
          ]))),
};
