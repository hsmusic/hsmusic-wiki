export default {
  contentDependencies: ['generateColorStyleVariables'],
  extraDependencies: ['html'],

  relations(relation, row) {
    return {
      colorVariables:
        relation('generateColorStyleVariables', row.color),
    };
  },

  data(row) {
    return {
      name: row.name,
    };
  },

  slots: {
    content: {type: 'html'},
  },

  generate(data, relations, slots, {html}) {
    return (
      html.tag('section',
        {
          class: 'row',
          style: [relations.colorVariables],
        },
        [
          html.tag('h2', data.name),
          slots.content,
        ]));
  },
};
