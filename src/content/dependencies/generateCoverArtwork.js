import {empty} from '#sugar';

export default {
  contentDependencies: ['image', 'linkArtTag'],
  extraDependencies: ['html', 'language'],

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

  generate(relations, slots, {html, language}) {
    switch (slots.mode) {
      case 'primary':
        return html.tag('div', {id: 'cover-art-container'}, [
          relations.image.slots({
            path: slots.path,
            alt: slots.alt,
            color: slots.color,
            thumb: 'medium',
            id: 'cover-art',
            reveal: true,
            link: true,
            square: true,
          }),

          !empty(relations.tagLinks) &&
            html.tag('p',
              language.$('releaseInfo.artTags.inline', {
                tags:
                  language.formatUnitList(
                    relations.tagLinks
                      .map(tagLink => tagLink.slot('preferShortName', true))),
              })),
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
