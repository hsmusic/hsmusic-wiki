import {empty} from '../../util/sugar.js';

export default {
  contentDependencies: [
    'linkArtist',
    'linkExternalAsIcon',
  ],

  extraDependencies: [
    'html',
    'language',
  ],

  relations(relation, contribution) {
    const relations = {};

    relations.artistLink =
      relation('linkArtist', contribution.who);

    if (!empty(contribution.who.urls)) {
      relations.artistIcons =
        contribution.who.urls
          .slice(0, 4)
          .map(url => relation('linkExternalAsIcon', url));
    }

    return relations;
  },

  data(contribution) {
    return {
      what: contribution.what,
    };
  },

  slots: {
    showContribution: {type: 'boolean', default: false},
    showIcons: {type: 'boolean', default: false},
    preventWrapping: {type: 'boolean', default: true},
  },

  generate(data, relations, slots, {html, language}) {
    const hasContributionPart = !!(slots.showContribution && data.what);
    const hasExternalPart = !!(slots.showIcons && relations.artistIcons);

    const externalLinks = hasExternalPart &&
      html.tag('span',
        {[html.noEdgeWhitespace]: true, class: 'icons'},
        language.formatUnitList(relations.artistIcons));

    const parts = ['misc.artistLink'];
    const options = {artist: relations.artistLink};

    if (hasContributionPart) {
      parts.push('withContribution');
      options.contrib = data.what;
    }

    if (hasExternalPart) {
      parts.push('withExternalLinks');
      options.links = externalLinks;
    }

    const content = language.formatString(parts.join('.'), options);

    return (
      (parts.length > 1 && slots.preventWrapping
        ? html.tag('span',
            {[html.noEdgeWhitespace]: true, class: 'nowrap'},
            content)
        : content));
    },
};
