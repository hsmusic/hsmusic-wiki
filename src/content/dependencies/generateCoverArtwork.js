export default {
  contentDependencies: [
    'generateCoverArtworkArtTagDetails',
    'generateCoverArtworkArtistDetails',
    'generateCoverArtworkOriginDetails',
    'image',
  ],

  extraDependencies: ['html'],

  relations: (relation, artwork) => ({
    originDetails:
      relation('generateCoverArtworkOriginDetails', artwork),

    artTagDetails:
      relation('generateCoverArtworkArtTagDetails', artwork),

    artistDetails:
      relation('generateCoverArtworkArtistDetails', artwork),
  }),

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

    showOriginDetails: {type: 'boolean', default: false},
    showArtTagDetails: {type: 'boolean', default: false},
    showArtistDetails: {type: 'boolean', default: false},

    details: {
      type: 'html',
      mutable: false,
    },
  },

  generate(relations, slots, {html}) {
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

              slots.showOriginDetails &&
                relations.originDetails,

              slots.showArtTagDetails &&
                relations.artTagDetails,

              slots.showArtistDetails &&
                relations.artistDetails,
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
