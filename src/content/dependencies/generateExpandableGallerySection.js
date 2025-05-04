export default {
  contentDependencies: ['generateContentHeading'],
  extraDependencies: ['html', 'language'],

  relations: (relation) => ({
    contentHeading:
      relation('generateContentHeading'),
  }),

  slots: {
    title: {
      type: 'html',
      mutable: false,
    },

    contentAboveCut: {
      type: 'html',
      mutable: false,
    },

    contentBelowCut: {
      type: 'html',
      mutable: false,
    },

    caption: {
      type: 'html',
      mutable: false,
    },

    expandCue: {
      type: 'html',
      mutable: false,
    },

    collapseCue: {
      type: 'html',
      mutable: false,
    },
  },

  generate: (relations, slots, {html, language}) =>
    html.tag('section', {class: 'expandable-gallery-section'}, [
      relations.contentHeading.slots({
        tag: 'h2',
        title: slots.title,
      }),

      html.tag('div', {class: 'section-content-above-cut'},
        {[html.onlyIfContent]: true},

        slots.contentAboveCut),

      html.tag('div', {class: 'section-content-below-cut'},
        {[html.onlyIfContent]: true},

        !html.isBlank(slots.contentBelowCut) &&
          {style: 'display: none'},

        slots.contentBelowCut),

      html.tag('div', {class: 'section-expando'},
        {[html.onlyIfSiblings]: true},

        html.tag('div', {class: 'section-expando-content'},
          {[html.joinChildren]: html.tag('br')},

          [
            html.tag('span', {class: 'section-caption'},
              slots.caption),

            !html.isBlank(slots.contentBelowCut) &&
              language.$('misc.coverGrid.expandCollapseCue', {
                cue:
                  html.tag('a', {class: 'section-expando-toggle'},
                    {href: '#'},

                    {[html.joinChildren]: ''},
                    {[html.noEdgeWhitespace]: true},

                    [
                      html.tag('span', {class: 'section-expand-cue'},
                        slots.expandCue),

                      html.tag('span', {class: 'section-collapse-cue'},
                        {style: 'display: none'},
                        slots.collapseCue),
                    ]),
              }),
          ])),
    ]),
};
