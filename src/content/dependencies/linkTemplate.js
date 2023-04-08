import {empty} from '../../util/sugar.js';

export default {
  extraDependencies: [
    'appendIndexHTML',
    'getColors',
    'html',
    'to',
  ],

  generate({
    appendIndexHTML,
    getColors,
    html,
    to,
  }) {
    return html.template({
      annotation: 'linkTemplate',

      slots: {
        href: {type: 'string'},
        path: {validate: v => v.validateArrayItems(v.isString)},
        hash: {type: 'string'},

        attributes: {validate: v => v.isAttributes},
        color: {validate: v => v.isColor},
        content: {type: 'html'},
      },

      content(slots) {
        let href = slots.href;
        let style;

        if (!href && !empty(slots.path)) {
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

        return html.tag('a',
          {
            ...slots.attributes ?? {},
            href,
            style,
          },
          slots.content);
      },
    });
  },
}
