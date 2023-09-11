import {empty} from '#sugar';

import striptags from 'striptags';

export default {
  extraDependencies: [
    'appendIndexHTML',
    'getColors',
    'html',
    'language',
    'to',
  ],

  slots: {
    href: {type: 'string'},
    path: {validate: v => v.validateArrayItems(v.isString)},
    hash: {type: 'string'},

    tooltip: {type: 'string'},
    attributes: {validate: v => v.isAttributes},
    color: {validate: v => v.isColor},
    content: {type: 'html'},
  },

  generate(slots, {
    appendIndexHTML,
    getColors,
    html,
    language,
    to,
  }) {
    let href;
    let style;
    let title;

    if (slots.href) {
      href = encodeURI(slots.href);
    } else if (!empty(slots.path)) {
      href = to(...slots.path);
    } else {
      href = '';
    }

    if (appendIndexHTML) {
      if (
        /^(?!https?:\/\/).+\/$/.test(href) &&
        href.endsWith('/')
      ) {
        href += 'index.html';
      }
    }

    if (slots.hash) {
      href += (slots.hash.startsWith('#') ? '' : '#') + slots.hash;
    }

    if (slots.color) {
      const {primary, dim} = getColors(slots.color);
      style = `--primary-color: ${primary}; --dim-color: ${dim}`;
    }

    if (slots.tooltip) {
      title = slots.tooltip;
    }

    const content =
      (html.isBlank(slots.content)
        ? language.$('misc.missingLinkContent')
        : striptags(html.resolve(slots.content, {normalize: 'string'}), {
            disallowedTags: new Set(['a']),
          }));

    return html.tag('a', {
      ...slots.attributes ?? {},
      href,
      style,
      title,
    }, content);
  },
}
