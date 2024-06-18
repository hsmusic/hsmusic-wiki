import {isExternalLinkContext} from '#external-links';

export default {
  contentDependencies: ['generateExternalIcon'],
  extraDependencies: ['html', 'language'],

  relations: (relation, url) => ({
    icon:
      relation('generateExternalIcon', url),
  }),

  data: (url) => ({url}),

  slots: {
    context: {
      // This awkward syntax is because the slot descriptor validator can't
      // differentiate between a function that returns a validator (the usual
      // syntax) and a function that is itself a validator.
      validate: () => isExternalLinkContext,
      default: 'generic',
    },
  },

  generate(data, relations, slots, {html, language}) {
    const format = style =>
      language.formatExternalLink(data.url, {style, context: slots.context});

    const platformText = format('platform');
    const handleText = format('handle');

    return (
      html.tag('a', {class: 'icon'},
        {href: data.url},
        {class: 'has-text'},

        [
          relations.icon,

          html.tag('span', {class: 'icon-text'},
            (html.isBlank(handleText)
              ? platformText
              : handleText)),
        ]));
  },
};
