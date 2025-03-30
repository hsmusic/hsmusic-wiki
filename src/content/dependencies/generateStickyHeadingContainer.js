export default {
  extraDependencies: ['html'],

  slots: {
    title: {
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
      !html.isBlank(slots.cover) &&
        {class: 'has-cover'},

      html.tag('div', {class: 'content-sticky-heading-anchor'},
        html.tag('div', {class: 'content-sticky-heading-container'},
          !html.isBlank(slots.cover) &&
            {class: 'has-cover'},

          [
            html.tag('div', {class: 'content-sticky-heading-row'}, [
              html.tag('h1', [
                slots.title,

                // Placement after generally keeps the contents from being
                // the first, when matched by .querySelector() calls.
                html.tag('span', {class: 'reference-collapsed-heading'},
                  slots.title.clone()),
              ]),

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

    html.tag('h1', {class: 'imaginary-static-heading-root'},
      html.tag('span', {class: 'imaginary-static-heading-row'},
        html.tag('span', {class: 'imaginary-static-heading-title'},
          slots.title.clone()))),
  ]),
};
