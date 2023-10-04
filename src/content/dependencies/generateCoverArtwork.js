import {stitchArrays} from '#sugar';

export default {
  contentDependencies: ['image', 'linkArtTagGallery'],
  extraDependencies: ['html'],

  query: (artTags) => ({
    linkableArtTags:
      (artTags
        ? artTags.filter(tag => !tag.isContentWarning)
        : []),
  }),

  relations: (relation, query, artTags) => ({
    image:
      relation('image', artTags),

    artTagLinks:
      query.linkableArtTags
        .filter(tag => !tag.isContentWarning)
        .map(tag => relation('linkArtTagGallery', tag)),
  }),

  data: (query) => {
    const data = {};

    const seenShortNames = new Set();
    const duplicateShortNames = new Set();

    for (const {nameShort: shortName} of query.linkableArtTags) {
      if (seenShortNames.has(shortName)) {
        duplicateShortNames.add(shortName);
      } else {
        seenShortNames.add(shortName);
      }
    }

    data.preferShortName =
      query.linkableArtTags
        .map(artTag => !duplicateShortNames.has(artTag.nameShort));

    return data;
  },

  slots: {
    path: {
      validate: v => v.validateArrayItems(v.isString),
    },

    alt: {
      type: 'string',
    },

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
  },

  generate(data, relations, slots, {html}) {
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
          relations.image.slots({
            path: slots.path,
            alt: slots.alt,
            color: slots.color,
            thumb: 'medium',
            reveal: true,
            link: true,
            ...sizeSlots,
          }),

          html.tag('ul', {class: 'image-details'},
            {[html.onlyIfContent]: true},

            stitchArrays({
              artTagLink: relations.artTagLinks,
              preferShortName: data.preferShortName,
            }).map(({artTagLink, preferShortName}) =>
                html.tag('li',
                  artTagLink.slot('preferShortName', preferShortName)))),
        ]);

      case 'thumbnail':
        return relations.image.slots({
          path: slots.path,
          alt: slots.alt,
          color: slots.color,
          thumb: 'small',
          reveal: false,
          link: false,
          ...sizeSlots,
        });

      case 'commentary':
        return relations.image.slots({
          path: slots.path,
          alt: slots.alt,
          color: slots.color,
          thumb: 'medium',
          reveal: true,
          link: true,
          lazy: true,
          ...sizeSlots,

          attributes:
            {class: 'commentary-art'},
        });

      default:
        return html.blank();
    }
  },
};
