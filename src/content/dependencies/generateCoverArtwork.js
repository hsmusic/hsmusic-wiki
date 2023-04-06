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

  generate(relations, {html, language}) {
    return html.template(slot =>
      html.tag('div', {id: 'cover-art-container'}, [
        relations.image
          .slot('path', slot('path'))
          .slot('alt', slot('alt'))
          .slot('thumb', 'medium')
          .slot('id', 'cover-art')
          .slot('link', true)
          .slot('square', true),

        !empty(relations.tagLinks) &&
          html.tag('p',
            language.$('releaseInfo.artTags.inline', {
              tags: language.formatUnitList(relations.tagLinks),
            })),
      ]));
  },
};
