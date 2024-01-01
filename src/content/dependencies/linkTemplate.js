import {empty} from '#sugar';

import striptags from 'striptags';

export default {
  extraDependencies: [
    'appendIndexHTML',
    'html',
    'language',
    'to',
  ],

  slots: {
    href: {type: 'string'},
    path: {validate: v => v.validateArrayItems(v.isString)},
    hash: {type: 'string'},
    linkless: {type: 'boolean', default: false},

    tooltip: {type: 'string'},
    attributes: {type: 'attributes'},
    content: {type: 'html'},
  },

  generate(slots, {
    appendIndexHTML,
    html,
    language,
    to,
  }) {
    const attributes = html.attributes();

    if (!slots.linkless) {
      let href =
        (slots.href
          ? encodeURI(slots.href)
       : !empty(slots.path)
          ? to(...slots.path)
          : '');

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

    const content =
      (html.isBlank(slots.content)
        ? language.$('misc.missingLinkContent')
        : striptags(html.resolve(slots.content, {normalize: 'string'}), {
            disallowedTags: new Set(['a']),
          }));

    return (
      html.tag('a',
        attributes,
        slots.attributes,
        content));
  },
}
