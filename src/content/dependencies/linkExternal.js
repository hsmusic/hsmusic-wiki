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
      default: 'platform',
    },

    context: {
      validate: () => isExternalLinkContext,
      default: 'generic',
    },

    tab: {
      validate: v => v.is('default', 'separate'),
      default: 'default',
    },
  },

  generate(data, slots, {html, language}) {
    let formattedText =
      language.formatExternalLink(data.url, {
        style: slots.style,
        context: slots.context,
      });

    // Fall back to platform if nothing matched the desired style.
    if (html.isBlank(formattedText) && slots.style !== 'platform') {
      formattedText =
        language.formatExternalLink(data.url, {
          style: 'platform',
          context: slots.context,
        });
    }

    const link =
      html.tag('a', formattedText);

    link.attributes.set('href', data.url);
    link.attributes.set('class', 'nowrap');

    if (slots.tab === 'separate') {
      link.attributes.set('target', '_blank');
    }

    return link;
  },
};
