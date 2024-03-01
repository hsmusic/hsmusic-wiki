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
      default: 'normal',
    },

    context: {
      validate: () => isExternalLinkContext,
      default: 'generic',
    },

    indicateExternal: {
      type: 'boolean',
      default: false,
    },

    tab: {
      validate: v => v.is('default', 'separate'),
      default: 'default',
    },
  },

  generate(data, slots, {html, language}) {
    const formattedLink =
      language.formatExternalLink(data.url, {
        style: slots.style,
        context: slots.context,
        indicateExternal: slots.indicateExternal,
      });

    return (
      html.tag('a',
        {href: data.url},
        {class: 'external-link'},

        slots.indicateExternal && [
          {class: 'indicate-external'},

          {title:
            (slots.tab === 'separate' && html.isBlank(slots.content)
              ? language.$('misc.external.opensInNewTab.annotation')
           : slots.tab === 'separate'
              ? language.$('misc.external.opensInNewTab', {
                  link: formattedLink,
                  annotation:
                    language.$('misc.external.opensInNewTab.annotation'),
                })
           : html.isBlank(slots.content)
              ? null
              : formattedLink)?.toString()},
        ],

        slots.tab === 'separate' &&
          {target: '_blank'},

        (html.isBlank(slots.content)
          ? formattedLink
          : slots.content)));
  },
};
