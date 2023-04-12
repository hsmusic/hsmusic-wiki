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

    relations.artistIcons =
      (artist.urls ?? []).map(url =>
        relation('linkExternalAsIcon', url));

    return relations;
  },

  data(artist, contribution) {
    return {contribution};
  },

  generate(data, relations, {
    html,
    language,
  }) {
    return html.template({
      annotation: 'linkContribution',

      slots: {
        showContribution: {type: 'boolean', default: false},
        showIcons: {type: 'boolean', default: false},
      },

      content(slots) {
        const hasContributionPart = !!(slots.showContribution && data.contribution);
        const hasExternalPart = !!(slots.showIcons && !empty(relations.artistIcons));

        const externalLinks = hasExternalPart &&
          html.tag('span',
            {[html.noEdgeWhitespace]: true, class: 'icons'},
            language.formatUnitList(relations.artistIcons));

        return (
          (hasContributionPart
            ? (hasExternalPart
                ? language.$('misc.artistLink.withContribution.withExternalLinks', {
                    artist: relations.artistLink,
                    contrib: data.contribution,
                    links: externalLinks,
                  })
                : language.$('misc.artistLink.withContribution', {
                    artist: relations.artistLink,
                    contrib: data.contribution,
                  }))
            : (hasExternalPart
                ? language.$('misc.artistLink.withExternalLinks', {
                    artist: relations.artistLink,
                    links: externalLinks,
                  })
                : language.$('misc.artistLink', {
                    artist: relations.artistLink,
                  }))));
      },
    });
  },
};
