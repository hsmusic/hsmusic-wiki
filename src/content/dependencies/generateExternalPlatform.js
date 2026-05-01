import {isExternalLinkContext} from '#external-links';

export default {
  data: (urlEntry) => ({urlEntry}),

  slots: {
    context: {
      validate: () => isExternalLinkContext,
      default: 'generic',
    },
  },

  generate: (data, slots, {language}) =>
    language.formatExternalLink(data.urlEntry, {
      style: 'platform',
      context: slots.context,
    }),
};
