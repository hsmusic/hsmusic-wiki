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
    let urlIsValid;
    try {
      new URL(data.url);
      urlIsValid = true;
    } catch (error) {
      urlIsValid = false;
    }

    let formattedLink;
    if (urlIsValid) {
      formattedLink =
        language.formatExternalLink(data.url, {
          style: slots.style,
          context: slots.context,
        });

      // Fall back to platform if nothing matched the desired style.
      if (html.isBlank(formattedLink) && slots.style !== 'platform') {
        formattedLink =
          language.formatExternalLink(data.url, {
            style: 'platform',
            context: slots.context,
          });
      }
    } else {
      formattedLink = null;
    }

    const linkAttributes = html.attributes({
      class: 'external-link',
    });

    let linkContent;
    if (urlIsValid) {
      linkAttributes.set('href', data.url);

      if (html.isBlank(slots.content)) {
        linkContent = formattedLink;
      } else {
        linkContent = slots.content;
      }
    } else {
      if (html.isBlank(slots.content)) {
        linkContent =
          html.tag('i',
            language.$('misc.external.invalidURL.annotation'));
      } else {
        linkContent =
          language.$('misc.external.invalidURL', {
            link: slots.content,
            annotation:
              html.tag('i',
                language.$('misc.external.invalidURL.annotation')),
          });
      }
    }

    if (urlIsValid && slots.indicateExternal) {
      linkAttributes.add('class', 'indicate-external');

      let titleText;
      if (slots.tab === 'separate') {
        if (html.isBlank(slots.content)) {
          titleText =
            language.$('misc.external.opensInNewTab.annotation');
        } else {
          titleText =
            language.$('misc.external.opensInNewTab', {
              link: formattedLink,
              annotation:
                language.$('misc.external.opensInNewTab.annotation'),
            });
        }
      } else if (!html.isBlank(slots.content)) {
        titleText = formattedLink;
      }

      if (titleText) {
        linkAttributes.set('title', titleText.toString());
      }
    }

    if (urlIsValid && slots.tab === 'separate') {
      linkAttributes.set('target', '_blank');
    }

    return html.tag('a', linkAttributes, linkContent);
  },
};
