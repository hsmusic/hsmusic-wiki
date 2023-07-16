import {empty} from '../../util/sugar.js';

export default {
  extraDependencies: [
    'appendIndexHTML',
    'getColors',
    'html',
    'to',
  ],

  slots: {
    href: {type: 'string'},
    path: {validate: v => v.validateArrayItems(v.isString)},
    hash: {type: 'string'},

    tooltip: {validate: v => v.isString},
    attributes: {validate: v => v.isAttributes},
    color: {validate: v => v.isColor},
    content: {type: 'html'},
  },

  generate(slots, {
    appendIndexHTML,
    getColors,
    html,
    to,
  }) {
    let href = slots.href;
    let style;
    let title;

    if (href) {
      href = encodeURI(href);
    } else if (!empty(slots.path)) {
      href = to(...slots.path);
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

    return html.tag('a',
      {
        ...slots.attributes ?? {},
        href,
        style,
        title,
      },
      slots.content);
  },
}
