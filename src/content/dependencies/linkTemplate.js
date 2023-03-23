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
    return html.template(slot =>
      slot('color', ([color]) =>
      slot('hash', ([hash]) =>
      slot('href', ([href]) =>
      slot('path', ([...path]) => {
        let style;

        if (!href && !empty(path)) {
          href = to(...path);
        }

        if (appendIndexHTML) {
          if (/^(?!https?:\/\/).+\/$/.test(href)) {
            href += 'index.html';
          }
        }

        if (hash) {
          href += (hash.startsWith('#') ? '' : '#') + hash;
        }

        if (color) {
          const {primary, dim} = getColors(color);
          style = `--primary-color: ${primary}; --dim-color: ${dim}`;
        }

        return slot('attributes', ([attributes]) =>
          html.tag('a',
            {
              ...attributes ?? {},
              href,
              style,
            },
            slot('content')));
      })))));
  },
}
