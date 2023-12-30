export default {
  contentDependencies: ['generateColorStyleVariables'],
  extraDependencies: ['html'],

  relations(relation) {
    return {
      colorVariables:
        relation('generateColorStyleVariables'),
    };
  },

  data(row) {
    return {
      name: row.name,
      color: row.color,
    };
  },

  slots: {
    content: {type: 'html'},
  },

  generate: (data, relations, slots, {html}) =>
    html.tag('section', {class: 'row'},
      {style:
        relations.colorVariables
          .slot('color', data.color)
          .content},

      [
        html.tag('h2', data.name),
        slots.content,
      ]),
};
