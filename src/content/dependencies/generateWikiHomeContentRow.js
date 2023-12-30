export default {
  contentDependencies: ['generateColorStyleAttribute'],
  extraDependencies: ['html'],

  relations: (relation, row) => ({
    colorStyle:
      relation('generateColorStyleAttribute', row.color),
  }),

  data: (row) =>
    ({name: row.name}),

  slots: {
    content: {type: 'html'},
  },

  generate: (data, relations, slots, {html}) =>
    html.tag('section', {class: 'row'},
      relations.colorStyle,

      [
        html.tag('h2', data.name),
        slots.content,
      ]),
};
