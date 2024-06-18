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
  },

  generate: (data, slots, {html, language, to}) =>
    html.tag('svg',
      html.tag('use', {
        href:
          to('staticMisc.icon',
            language.formatExternalLink(data.url, {
              style: 'icon-id',
              context: slots.context,
            })),
      })),
};
