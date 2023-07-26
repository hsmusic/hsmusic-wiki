import {empty} from '../../util/sugar.js';

export default {
  extraDependencies: ['html'],

  slots: {
    actionLinks: {validate: v => v.sparseArrayOf(v.isHTML)},
  },

  generate(slots, {html}) {
    if (empty(slots.actionLinks)) {
      return html.blank();
    }

    return (
      html.tag('div', {class: 'grid-actions'},
        slots.actionLinks
          .filter(Boolean)
          .map(link => link
            .slot('attributes', {class: ['grid-item', 'box']}))));
  },
};
