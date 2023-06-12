import {empty} from '../../util/sugar.js';

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

    displayMode: {
      validate: v => v.is('primary', 'thumbnail'),
      default: 'primary',
    },
  },

  generate(relations, slots, {html, language}) {
    switch (slots.displayMode) {
      case 'primary':
        return html.tag('div', {id: 'cover-art-container'}, [
          relations.image
            .slots({
              path: slots.path,
              alt: slots.alt,
              thumb: 'medium',
              id: 'cover-art',
              reveal: true,
              link: true,
              square: true,
            }),

          !empty(relations.tagLinks) &&
            html.tag('p',
              language.$('releaseInfo.artTags.inline', {
                tags: language.formatUnitList(relations.tagLinks),
              })),
          ]);

      case 'thumbnail':
        return relations.image
          .slots({
            path: slots.path,
            alt: slots.alt,
            thumb: 'small',
            reveal: false,
            link: false,
            square: true,
          });

      default:
        return html.blank();
    }
  },
};
