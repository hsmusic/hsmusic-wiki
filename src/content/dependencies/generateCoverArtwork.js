export default {
  relations: (relation, artwork) => ({
    colorStyleAttribute:
      relation('generateColorStyleAttribute'),

    image:
      relation('image', artwork),

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
    attachAbove:
      artwork.attachAbove,

    attachedArtworkIsMainArtwork:
      (artwork.attachAbove
        ? artwork.attachedArtwork.isMainArtwork
        : null),

    color:
      artwork.thing.color ?? null,

    dimensions:
      artwork.dimensions,

    style:
      artwork.style,
  }),

  slots: {
    alt: {type: 'string'},

    color: {
      validate: v => v.anyOf(v.isBoolean, v.isColor),
      default: false,
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

    const imgAttributes = html.attributes();

    if (data.style) {
      imgAttributes.add('style', data.style.split('\n').join(' '));
    }

    image.setSlot('imgAttributes', imgAttributes);

    image.setSlot('alt', slots.alt);

    const square =
      (data.dimensions
        ? data.dimensions[0] === data.dimensions[1]
        : true);

    if (square) {
      image.setSlot('square', true);
    } else {
      image.setSlot('dimensions', data.dimensions);
    }

    const attributes = html.attributes();

    let color = null;
    if (typeof slots.color === 'boolean') {
      if (slots.color) {
        color = data.color;
      }
    } else if (slots.color) {
      color = slots.color;
    }

    if (color) {
      relations.colorStyleAttribute.setSlot('color', color);
      attributes.add(relations.colorStyleAttribute);
    }

    return html.tags([
      data.attachAbove &&
        html.tag('div', {class: 'cover-artwork-joiner'}),

      html.tag('div', {class: 'cover-artwork'},
        slots.mode === 'commentary' &&
          {class: 'commentary-art'},

        data.attachAbove &&
        data.attachedArtworkIsMainArtwork &&
          {class: 'attached-artwork-is-main-artwork'},

        attributes,

        (slots.mode === 'primary'
          ? [
              relations.image.slots({
                thumb: 'medium',
                reveal: true,
                link: true,

                responsiveThumb: true,
                responsiveSizes:
                  // No clamp(), min(), or max() here because Safari.
                  // The boundaries here are mostly experimental, apart from
                  // the ones which flat-out switch layouts.

                  // Layout - Thin (phones)
                  // Most of viewport width
                  '(max-width: 600px) 90vw,\n' +

                  // Layout - Medium
                  // Sidebar is hidden; content area is by definition
                  // most of the viewport
                  '(max-width: 640px) 220px,\n' +
                  '(max-width: 800px) 36vw,\n' +
                  '(max-width: 850px) 280px,\n' +

                  // Layout - Wide
                  // Sidebar is visible; content area has its own maximum
                  // Assume the sidebar is at minimum width
                  '(max-width: 880px) 220px,\n' +
                  '(max-width: 1050pz) calc(0.40 * (90vw - 150px - 10px)),\n' +
                  '280px',
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
          : html.blank())),
    ]);
  },
};
