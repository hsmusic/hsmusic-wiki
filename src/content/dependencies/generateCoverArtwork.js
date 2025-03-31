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

    return (
      html.tag('div', {class: 'cover-artwork'},
        slots.mode === 'commentary' &&
          {class: 'commentary-art'},

        (slots.mode === 'primary'
          ? [
              slots.image.slots({
                thumb: 'medium',
                reveal: true,
                link: true,

                warnings: slots.warnings,
                ...sizeSlots,
              }),

              slots.details,
            ]
       : slots.mode === 'thumbnail'
          ? slots.image.slots({
              thumb: 'small',
              reveal: false,
              link: false,

              warnings: slots.warnings,
              ...sizeSlots,
            })
       : slots.mode === 'commentary'
          ? slots.image.slots({
              thumb: 'medium',
              reveal: true,
              link: true,
              lazy: true,

              warnings: slots.warnings,
              ...sizeSlots,
            })
          : html.blank())));
  },
};
