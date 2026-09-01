import {compareArrays, empty} from '#sugar';

import striptags from 'striptags';

export default {
  slots: {
    href: {type: 'string'},
    path: {validate: v => v.validateArrayItems(v.isString)},
    hash: {type: 'string'},
    linkless: {type: 'boolean', default: false},
    tooltip: {type: 'string'},

    attributes: {
      type: 'attributes',
      mutable: true,
    },

    content: {
      type: 'html',
      mutable: false,
    },

    suffixNormalContent: {
      type: 'html',
      mutable: false,
    },
  },

  generate(slots, {
    appendIndexHTML,
    html,
    language,
    to,
    pagePath,
    pagePathStringFromRoot,
  }) {
    const {attributes} = slots;

    if (!slots.linkless) {
      let href =
        (slots.href
          ? encodeURI(slots.href)
       : !empty(slots.path)
          ? to(...slots.path)
          : '');

      const locallink =
        (slots.path
            // This precludes links to any other scope on the site...
            // but like, those *aren't pages,* so of course that means
            // this link isn't a link to the current page.
          ? slots.path.at(0).startsWith('localized.') &&
            compareArrays(pagePath, [
              slots.path.at(0).replace(/^localized\./, ''),
              ...slots.path.slice(1),
            ])

       : href.startsWith('/')
          ? href === pagePathStringFromRoot
          : false);

      if (locallink) {
        attributes.add('class', 'local-link');
      }

      if (appendIndexHTML) {
        if (/^(?!https?:\/\/).+\/$/.test(href) && href.endsWith('/')) {
          href += 'index.html';
        }
      }

      if (slots.hash) {
        href += (slots.hash.startsWith('#') ? '' : '#') + slots.hash;
      }

      attributes.add({href});
    }

    if (slots.tooltip) {
      attributes.set('title', slots.tooltip);
    }

    const mainContent =
      (html.isBlank(slots.content)
        ? language.$('misc.missingLinkContent')
        : striptags(
            html.resolve(slots.content, {normalize: 'string'}),
            {disallowedTags: new Set(['a'])}));

    const allContent =
      (html.isBlank(slots.suffixNormalContent)
        ? mainContent
        : html.tags([
            mainContent,
            html.tag('span', {class: 'normal-content'},
              slots.suffixNormalContent),
          ], {[html.joinChildren]: ''}));

    return html.tag('a', attributes, allContent);
  },
}
