import {isExternalLinkContext, isExternalLinkStyle} from '#external-links';

export default {
  extraDependencies: ['html', 'language', 'wikiData'],

  data: (url) => ({url}),

  slots: {
    content: {
      type: 'html',
      mutable: false,
    },

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
    const linkAttributes = html.attributes();
    let linkContent = slots.content;

    if (html.isBlank(linkContent)) {
      linkContent =
        language.formatExternalLink(data.url, {
          style: slots.style,
          context: slots.context,
        });
    }

    // Fall back to platform if nothing matched the desired style.
    if (html.isBlank(linkContent) && slots.style !== 'platform') {
      linkContent =
        language.formatExternalLink(data.url, {
          style: 'platform',
          context: slots.context,
        });
    }

    linkAttributes.set('href', data.url);
    linkAttributes.set('class', 'nowrap');

    if (slots.tab === 'separate') {
      linkAttributes.set('target', '_blank');
    }

    return html.tag('a', linkAttributes, linkContent);
  },
};
