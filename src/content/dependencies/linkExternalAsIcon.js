export default {
  extraDependencies: ['html', 'language', 'to'],

  data: (url) => ({url}),

  slots: {
    withText: {type: 'boolean'},
  },

  generate(data, slots, {html, language, to}) {
    const {url} = data;

    const normalText = language.formatExternalLink(url, {style: 'normal'});
    const compactText = language.formatExternalLink(url, {style: 'compact'});
    const iconId = language.formatExternalLink(url, {style: 'icon-id'});

    return html.tag('a',
      {href: url, class: ['icon', slots.withText && 'has-text']},
      [
        html.tag('svg', [
          !slots.withText &&
            html.tag('title', normalText),

          html.tag('use', {
            href: to('shared.staticIcon', iconId),
          }),
        ]),

        slots.withText &&
          html.tag('span', {class: 'icon-text'},
            compactText ?? normalText),
      ]);
  },
};
