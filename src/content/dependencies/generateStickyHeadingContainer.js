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

  generate: (slots, {html}) =>
    html.tag('div', {class: 'content-sticky-heading-container'},
      !html.isBlank(slots.cover) &&
        {class: 'has-cover'},

      [
        html.tag('div', {class: 'content-sticky-heading-row'}, [
          html.tag('h1', slots.title),

          html.tag('div', {class: 'content-sticky-heading-cover-container'},
            {[html.onlyIfContent]: true},

            html.tag('div', {class: 'content-sticky-heading-cover'},
              {[html.onlyIfContent]: true},

              // TODO: We shouldn't need to do an isBlank check here,
              // but a live blank value doesn't have a slot functions, so.
              (html.isBlank(slots.cover)
                ? html.blank()
                : slots.cover.slot('mode', 'thumbnail')))),
        ]),

        html.tag('div', {class: 'content-sticky-subheading-row'},
          html.tag('h2', {class: 'content-sticky-subheading'})),
      ]),
};
