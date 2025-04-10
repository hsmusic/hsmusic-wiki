export default {
  contentDependencies: [
    'generateCoverArtworkArtTagDetails',
    'generateCoverArtworkArtistDetails',
    'generateCoverArtworkOriginDetails',
    'generateCoverArtworkReferenceDetails',
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

    referenceDetails:
      relation('generateCoverArtworkReferenceDetails', artwork),
  }),

  data: (artwork) => ({
    color:
      artwork.thing.color ?? null,

    path:
      artwork.path,

    dimensions:
      artwork.dimensions,

    warnings:
      artwork.artTags
        .filter(tag => tag.isContentWarning)
        .map(tag => tag.name),
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

    showOriginDetails: {type: 'boolean', default: false},
    showArtTagDetails: {type: 'boolean', default: false},
    showArtistDetails: {type: 'boolean', default: false},
    showReferenceDetails: {type: 'boolean', default: false},

    details: {
      type: 'html',
      mutable: false,
    },
  },

  generate(data, relations, slots, {html}) {
    const {image} = relations;

    image.setSlots({
      path: data.path,
      warnings: data.warnings,

      color: slots.color ?? data.color,
      alt: slots.alt,
    });

    const square =
      (data.dimensions
        ? data.dimensions[0] === data.dimensions[1]
        : true);

    if (square) {
      image.setSlot('square', true);
    } else {
      image.setSlot('dimensions', data.dimensions);
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

              slots.showReferenceDetails &&
                relations.referenceDetails,

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
