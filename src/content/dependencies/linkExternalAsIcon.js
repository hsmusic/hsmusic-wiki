import {isExternalLinkContext} from '#external-links';

export default {
  extraDependencies: ['html', 'language', 'to'],

  data: (url) => ({url}),

  slots: {
    context: {
      // This awkward syntax is because the slot descriptor validator can't
      // differentiate between a function that returns a validator (the usual
      // syntax) and a function that is itself a validator.
      validate: () => isExternalLinkContext,
      default: 'generic',
    },

    withText: {type: 'boolean'},
  },

  generate(data, slots, {html, language, to}) {
    const format = style =>
      language.formatExternalLink(data.url, {style, context: slots.context});

    const platformText = format('platform');
    const handleText = format('handle');
    const iconId = format('icon-id');

    return html.tag('a', {class: 'icon'},
      {href: data.url},

      slots.withText &&
        {class: 'has-text'},

      [
        html.tag('svg', [
          !slots.withText &&
            html.tag('title', platformText),

          html.tag('use', {
            href: to('shared.staticIcon', iconId),
          }),
        ]),

        slots.withText &&
          html.tag('span', {class: 'icon-text'},
            (html.isBlank(handleText)
              ? platformText
              : handleText)),
      ]);
  },
};
