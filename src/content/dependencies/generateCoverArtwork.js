import {empty, stitchArrays} from '#sugar';

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
  },

  generate(data, relations, slots, {html}) {
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
            square: true,
          }),

          !empty(relations.artTagLinks) &&
            html.tag('ul', {class: 'image-details'},
              stitchArrays({
                tagLink: relations.artTagLinks,
                preferShortName: data.preferShortName,
              }).map(({tagLink, preferShortName}) =>
                  html.tag('li',
                    tagLink.slot('preferShortName', preferShortName)))),
        ]);

      case 'thumbnail':
        return relations.image.slots({
          path: slots.path,
          alt: slots.alt,
          color: slots.color,
          thumb: 'small',
          reveal: false,
          link: false,
          square: true,
        });

      case 'commentary':
        return relations.image.slots({
          path: slots.path,
          alt: slots.alt,
          color: slots.color,
          thumb: 'medium',
          reveal: true,
          link: true,
          square: true,
          lazy: true,

          attributes:
            {class: 'commentary-art'},
        });

      default:
        return html.blank();
    }
  },
};
