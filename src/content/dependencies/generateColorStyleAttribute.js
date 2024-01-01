export default {
  contentDependencies: ['generateColorStyleVariables'],
  extraDependencies: ['html'],

  relations: (relation) => ({
    colorVariables:
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

    context: {
      validate: v => v.is(
        'any-content',
        'image-box',
        'primary-only'),

      default: 'any-content',
    },
  },

  generate: (data, relations, slots) => ({
    style:
      relations.colorVariables.slots({
        color: slots.color ?? data.color,
        context: slots.context,
      }).content,
  }),
};
