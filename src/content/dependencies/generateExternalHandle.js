import {isExternalLinkContext} from '#external-links';

export default {
  data: (url) => ({url}),

  slots: {
    context: {
      validate: () => isExternalLinkContext,
      default: 'generic',
    },
  },

  generate: (data, slots, {language}) =>
    language.formatExternalLink(data.url, {
      style: 'handle',
      context: slots.context,
    }),
};
