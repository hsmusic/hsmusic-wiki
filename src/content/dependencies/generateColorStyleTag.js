export default {
  contentDependencies: ['generateColorStyleVariables'],
  extraDependencies: ['html'],

  relations: (relation) => ({
    variables:
      relation('generateColorStyleVariables'),
  }),

  data: (color) => ({
    color:
      color ?? null,
  }),

  slots: {
    color: {
      validate: v => v.isColor,
    },
  },

  generate(data, relations, slots, {html}) {
    const color =
      data.color ?? slots.color;

    if (!color) {
      return html.blank();
    }

    const style =
      html.tag('style', {class: 'color-style'},
        {'data-color': color},

        `:root {\n` +
        relations.variables
          .slots({
            color,
            context: 'page-root',
            mode: 'property-list',
          })
          .content
          .map(line => '    ' + line + ';\n')
          .join('') +
        `}`);

    return style;
  },
};
