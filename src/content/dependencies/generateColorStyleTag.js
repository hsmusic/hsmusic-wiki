export default {
  contentDependencies: ['generateColorStyleVariables', 'generateStyleTag'],
  extraDependencies: ['html'],

  relations: (relation) => ({
    styleTag:
      relation('generateStyleTag'),

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

    return relations.styleTag.slots({
      attributes: [
        {class: 'color-style'},
        {'data-color': color},
      ],

      rules: [
        {
          select: ':root',
          declare:
            relations.variables.slots({
              color,
              context: 'page-root',
              mode: 'declarations',
            }).content,
        },
      ],
    });
  },
};
