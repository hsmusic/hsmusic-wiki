export default {
  extraDependencies: ['html'],

  slots: {
    rootAttributes: {
      type: 'attributes',
      mutable: false,
    },

    title: {
      type: 'html',
      mutable: false,
    },

    subtitle: {
      type: 'html',
      mutable: false,
    },

    cover: {
      type: 'html',
      mutable: true,
    },
  },

  generate: (slots, {html}) => html.tags([
    html.tag('div', {class: 'content-sticky-heading-root'},
      slots.rootAttributes,

      !html.isBlank(slots.cover) &&
        {class: 'has-cover'},

      html.tag('div', {class: 'content-sticky-heading-anchor'},
        html.tag('div', {class: 'content-sticky-heading-container'},
          !html.isBlank(slots.cover) &&
            {class: 'has-cover'},

          [
            html.tag('div', {class: 'content-sticky-heading-row'}, [
              html.tag('h1', [
                html.tag('span', {class: 'reference-collapsed-heading'},
                  {inert: true},

                  slots.title.clone()),

                slots.title,
              ]),

              html.tag('h2', {[html.onlyIfContent]: true},
                slots.subtitle),

              html.tag('div', {class: 'content-sticky-heading-cover-container'},
                {[html.onlyIfContent]: true},

                html.tag('div', {class: 'content-sticky-heading-cover'},
                  {[html.onlyIfContent]: true},

                  (html.isBlank(slots.cover)
                    ? html.blank()
                    : slots.cover.slot('mode', 'thumbnail')))),
            ]),

            html.tag('div', {class: 'content-sticky-subheading-row'},
              html.tag('h2', {class: 'content-sticky-subheading'})),
          ]))),
  ]),
};
