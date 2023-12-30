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

  generate(data, relations, slots) {
    const color = data.color ?? slots.color;

    if (!color) {
      return '';
    }

    return [
      `:root {`,
      ...(
        relations.variables
          .slots({
            color,
            context: 'page-root',
            mode: 'property-list',
          })
          .content
          .map(line => line + ';')),
      `}`,
    ].join('\n');
  },
};
