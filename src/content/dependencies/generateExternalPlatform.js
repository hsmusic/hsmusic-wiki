import {isExternalLinkContext} from '#external-links';

export default {
  extraDependencies: ['html', 'language'],

  data: (url) => ({url}),

  slots: {
    context: {
      validate: () => isExternalLinkContext,
      default: 'generic',
    },
  },

  generate: (data, slots, {language}) =>
    language.formatExternalLink(data.url, {
      style: 'platform',
      context: slots.context,
    }),
};
