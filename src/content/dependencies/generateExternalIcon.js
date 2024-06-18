import {isExternalLinkContext} from '#external-links';

export default {
  extraDependencies: ['html', 'language', 'to'],

  data: (url) => ({url}),

  slots: {
    context: {
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
