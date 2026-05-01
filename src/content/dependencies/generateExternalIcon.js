import {isExternalLinkContext} from '#external-links';

export default {
  data: (urlEntry) => ({urlEntry}),

  slots: {
    context: {
      validate: () => isExternalLinkContext,
      default: 'generic',
    },
  },

  generate: (data, slots, {html, language, to}) =>
    html.tag('span', {class: 'external-icon'},
      html.tag('svg',
        html.tag('use', {
          href:
            to('staticMisc.icon',
              language.formatExternalLink(data.urlEntry, {
                style: 'icon-id',
                context: slots.context,
              })),
        }))),
};
