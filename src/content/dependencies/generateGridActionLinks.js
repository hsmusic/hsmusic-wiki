export default {
  extraDependencies: ['html'],

  slots: {
    actionLinks: {validate: v => v.sparseArrayOf(v.isHTML)},
  },

  generate: (slots, {html}) =>
    html.tag('div', {class: 'grid-actions'},
      {[html.onlyIfContent]: true},

      (slots.actionLinks ?? [])
        .filter(link => link && !html.isBlank(link))
        .map(link => link
          .slot('attributes', {class: ['grid-item', 'box']}))),
};
