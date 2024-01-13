import {empty} from '#sugar';

export default {
  contentDependencies: ['image', 'linkArtTag'],
  extraDependencies: ['html'],

  relations(relation, artTags) {
    const relations = {};

    relations.image =
      relation('image', artTags);

    if (artTags) {
      relations.tagLinks =
        artTags
          .filter(tag => !tag.isContentWarning)
          .map(tag => relation('linkArtTag', tag));
    } else {
      relations.tagLinks = null;
    }

    return relations;
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

  generate(relations, slots, {html}) {
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

          !empty(relations.tagLinks) &&
            html.tag('ul', {class: 'image-details'},
              relations.tagLinks
                .map(tagLink =>
                  html.tag('li',
                    tagLink.slot('preferShortName', true)))),
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
          class: 'commentary-art',
          reveal: true,
          link: true,
          square: true,
          lazy: true,
        });

      default:
        return html.blank();
    }
  },
};
