export default {
  contentDependencies: [
    'generateCoverArtworkArtTagDetails',
    'generateCoverArtworkArtistDetails',
    'generateCoverArtworkOriginDetails',
    'image',
  ],

  extraDependencies: ['html'],

  relations: (relation, artwork) => ({
    image:
      relation('image'),

    originDetails:
      relation('generateCoverArtworkOriginDetails', artwork),

    artTagDetails:
      relation('generateCoverArtworkArtTagDetails', artwork),

    artistDetails:
      relation('generateCoverArtworkArtistDetails', artwork),
  }),

  data: (artwork) => ({
    path:
      artwork.path,
  }),

  slots: {
    alt: {type: 'string'},

    color: {
      validate: v => v.isColor,
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

  generate(data, relations, slots, {html}) {
    const {image} = relations;

    image.setSlots({
      path: data.path,

      color: slots.color,
      alt: slots.alt,
      warnings: slots.warnings,
    });

    const square =
      (slots.dimensions
        ? slots.dimensions[0] === slots.dimensions[1]
        : true);

    if (square) {
      image.setSlot('square', true);
    } else {
      image.setSlot('dimensions', slots.dimensions);
    }

    return (
      html.tag('div', {class: 'cover-artwork'},
        slots.mode === 'commentary' &&
          {class: 'commentary-art'},

        (slots.mode === 'primary'
          ? [
              relations.image.slots({
                thumb: 'medium',
                reveal: true,
                link: true,
              }),

              slots.showOriginDetails &&
                relations.originDetails,

              slots.showArtTagDetails &&
                relations.artTagDetails,

              slots.showArtistDetails &&
                relations.artistDetails,

              slots.details,
            ]
       : slots.mode === 'thumbnail'
          ? relations.image.slots({
              thumb: 'small',
              reveal: false,
              link: false,
            })
       : slots.mode === 'commentary'
          ? relations.image.slots({
              thumb: 'medium',
              reveal: true,
              link: true,
              lazy: true,
            })
          : html.blank())));
  },
};
