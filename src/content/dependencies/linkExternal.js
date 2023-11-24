import {isExternalLinkContext, isExternalLinkStyle} from '#external-links';

export default {
  extraDependencies: ['html', 'language', 'wikiData'],

  data: (url) => ({url}),

  slots: {
    style: {
      // This awkward syntax is because the slot descriptor validator can't
      // differentiate between a function that returns a validator (the usual
      // syntax) and a function that is itself a validator.
      validate: () => isExternalLinkStyle,
      default: 'normal',
    },

    context: {
      validate: () => isExternalLinkContext,
      default: 'generic',
    },
  },

  generate: (data, slots, {html, language}) =>
    html.tag('a',
      {href: data.url, class: 'nowrap'},
      language.formatExternalLink(data.url, {
        style: slots.style,
        context: slots.context,
      })),
};
