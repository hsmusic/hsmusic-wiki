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
          .slot('color', slots.color)
          .content
          .split(';')
          .map(line => line + ';')),
      `}`,
    ].join('\n');
  },
};
