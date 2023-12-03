export default {
  contentDependencies: ['generateColorStyleVariables'],
  extraDependencies: ['html'],

  relations: (relation) =>
    ({variables: relation('generateColorStyleVariables')}),

  slots: {
    color: {validate: v => v.isColor},
  },

  generate(relations, slots) {
    if (!slots.color) {
      return '';
    }

    return [
      `:root {`,
      ...(
        relations.variables
          .slots({
            color: slots.color,
            context: 'page-root',
            mode: 'property-list',
          })
          .content
          .map(line => line + ';')),
      `}`,
    ].join('\n');
  },
};
