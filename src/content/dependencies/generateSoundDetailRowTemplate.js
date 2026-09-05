export default {
  relations: (relation, detail) => ({
    notes:
      relation('transformContent', detail.notes),
  }),

  slots: {
    content: {type: 'html', mutable: false},
  },

  generate: (relations, slots, {html}) =>
    html.tag('li',
      slots.content,

      html.tag('span', {class: 'notes'},
        {[html.onlyIfContent]: true},
        relations.notes.slot('mode', 'multiline')))
};
