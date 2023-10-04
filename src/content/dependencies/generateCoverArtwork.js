export default {
  contentDependencies: ['image'],
  extraDependencies: ['html'],

  slots: {
    image: {
      type: 'html',
      mutable: true,
    },

    mode: {
      validate: v => v.is('primary', 'thumbnail', 'commentary'),
      default: 'primary',
    },

    dimensions: {
      validate: v => v.isDimensions,
    },

    warnings: {
      validate: v => v.looseArrayOf(v.isString),
    },

    details: {
      type: 'html',
      mutable: false,
    },
  },

  generate(slots, {html}) {
    const square =
      (slots.dimensions
        ? slots.dimensions[0] === slots.dimensions[1]
        : true);

    const sizeSlots =
      (square
        ? {square: true}
        : {dimensions: slots.dimensions});

    switch (slots.mode) {
      case 'primary':
        return html.tags([
          slots.image.slots({
            thumb: 'medium',
            reveal: true,
            link: true,

            warnings: slots.warnings,
            ...sizeSlots,
          }),

          slots.details,
        ]);

      case 'thumbnail':
        return (
          slots.image.slots({
            thumb: 'small',
            reveal: false,
            link: false,

            warnings: slots.warnings,
            ...sizeSlots,
          }));

      case 'commentary':
        return (
          slots.image.slots({
            thumb: 'medium',
            reveal: true,
            link: true,
            lazy: true,

            warnings: slots.warnings,
            ...sizeSlots,

            attributes:
              {class: 'commentary-art'},
          }));

      default:
        return html.blank();
    }
  },
};
