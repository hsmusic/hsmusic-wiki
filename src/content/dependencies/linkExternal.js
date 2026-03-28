import {isExternalLinkContext, isExternalLinkStyle} from '#external-links';

export default {
  sprawl: ({wikiInfo}) => ({
    canonicalBase:
      wikiInfo.canonicalBase,

    canonicalMediaBase:
      wikiInfo.canonicalMediaBase,
  }),

  data: (sprawl, url) => ({
    url,

    canonicalBase:
      sprawl.canonicalBase,

    canonicalMediaBase:
      sprawl.canonicalMediaBase,
  }),

  slots: {
    content: {
      type: 'html',
      mutable: false,
    },

    attributes: {
      type: 'attributes',
      mutable: false,
    },

    suffixNormalContent: {
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

    fromContent: {
      type: 'boolean',
      default: false,
    },

    indicateExternal: {
      type: 'boolean',
      default: false,
    },

    disableBrowserTooltip: {
      type: 'boolean',
      default: false,
    },

    tab: {
      validate: v => v.is('default', 'separate'),
      default: 'default',
    },
  },

  generate(data, slots, {html, language, to}) {
    const {url} = data;

    let urlIsValid;
    try {
      new URL(url);
      urlIsValid = true;
    } catch {
      urlIsValid = false;
    }

    let href;
    if (urlIsValid) {
      const {canonicalBase, canonicalMediaBase} = data;
      const past = front => decodeURIComponent(url.slice(front.length));
      if (canonicalMediaBase && url.startsWith(canonicalMediaBase)) {
        href = to('media.path', past(canonicalMediaBase));
      } else if (canonicalBase && url.startsWith(canonicalBase)) {
        href = to('shared.path', past(canonicalBase));
      } else {
        href = url;
      }
    }

    let formattedLink;
    if (urlIsValid) {
      formattedLink =
        language.formatExternalLink(url, {
          style: slots.style,
          context: slots.context,
        });

      // Fall back to platform if nothing matched the desired style.
      if (html.isBlank(formattedLink) && slots.style !== 'platform') {
        formattedLink =
          language.formatExternalLink(url, {
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
      linkAttributes.set('href', href);

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

    if (slots.fromContent) {
      linkAttributes.add('class', 'from-content');
    }

    if (urlIsValid && slots.indicateExternal) {
      linkAttributes.add('class', 'indicate-external');

      let titleText;
      if (slots.disableBrowserTooltip) {
        titleText = null;
      } else if (slots.tab === 'separate') {
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

    if (!html.isBlank(slots.suffixNormalContent)) {
      linkContent =
        html.tags([
          linkContent,

          html.tag('span', {class: 'normal-content'},
            slots.suffixNormalContent),
        ], {[html.joinChildren]: ''});
    }

    linkAttributes.add(slots.attributes);

    return html.tag('a', linkAttributes, linkContent);
  },
};
