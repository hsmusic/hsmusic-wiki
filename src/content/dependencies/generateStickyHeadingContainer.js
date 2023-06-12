export default {
  extraDependencies: ['html'],

  slots: {
    title: {type: 'html'},
    cover: {type: 'html'},
  },

  generate(slots, {html}) {
    const hasCover = !html.isBlank(slots.cover);

    return html.tag('div',
      {
        class: [
          'content-sticky-heading-container',
          hasCover && 'has-cover',
        ],
      },
      [
        html.tag('div', {class: 'content-sticky-heading-row'}, [
          html.tag('h1', slots.title),

          hasCover &&
            html.tag('div', {class: 'content-sticky-heading-cover-container'},
              html.tag('div', {class: 'content-sticky-heading-cover'},
                slots.cover.slot('displayMode', 'thumbnail'))),
        ]),

        html.tag('div', {class: 'content-sticky-subheading-row'},
          html.tag('h2', {class: 'content-sticky-subheading'})),
      ]);
  },
};
