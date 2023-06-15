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

  relations(relation, artist) {
    const relations = {};

    relations.artistLink = relation('linkArtist', artist);

    if (!empty(artist.urls)) {
      relations.artistIcons =
        artist.urls
          .slice(0, 4)
          .map(url => relation('linkExternalAsIcon', url));
    }

    return relations;
  },

  data(artist, contribution) {
    return {contribution};
  },

  slots: {
    showContribution: {type: 'boolean', default: false},
    showIcons: {type: 'boolean', default: false},
  },

  generate(data, relations, slots, {html, language}) {
    const hasContributionPart = !!(slots.showContribution && data.contribution);
    const hasExternalPart = !!(slots.showIcons && relations.artistIcons);

    const externalLinks = hasExternalPart &&
      html.tag('span',
        {[html.noEdgeWhitespace]: true, class: 'icons'},
        language.formatUnitList(relations.artistIcons));

    const parts = ['misc.artistLink'];
    const options = {artist: relations.artistLink};

    if (hasContributionPart) {
      parts.push('withContribution');
      options.contrib = data.contribution;
    }

    if (hasExternalPart) {
      parts.push('withExternalLinks');
      options.links = externalLinks;
    }

    const content = language.formatString(parts.join('.'), options);

    return (
      (parts.length > 1
        ? html.tag('span',
            {[html.noEdgeWhitespace]: true, class: 'nowrap'},
            content)
        : content));
    },
};
