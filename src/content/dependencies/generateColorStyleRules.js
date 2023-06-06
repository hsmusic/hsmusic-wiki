export default {
  contentDependencies: [
    'generateColorStyleVariables',
  ],

  relations(relation, color) {
    const relations = {};

    if (color) {
      relations.variables =
        relation('generateColorStyleVariables', color);
    }

    return relations;
  },

  generate(relations) {
    if (!relations.variables) return '';

    return [
      `:root {`,
      // This is pretty hilariously hacky.
      ...relations.variables.split(';').map(line => line + ';'),
      `}`,
    ].join('\n');
  },
};
