export default {
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
        'banner',
        'primary-only'),

      default: 'any-content',
    },
  },

  generate(data, relations, slots) {
    const {colorVariables} = relations;

    colorVariables.setSlots({
      color: slots.color ?? data.color,
      context: slots.context,
    });

    if (colorVariables.content) {
      return {style: colorVariables.content};
    } else {
      return {};
    }
  },
};
