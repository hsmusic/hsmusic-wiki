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

  relations(relation, contributions, {showIcons = false} = {}) {
    const relations = {};

    relations.artistLinks =
      contributions.map(({who}) => relation('linkArtist', who));

    if (showIcons) {
      relations.artistIcons =
        contributions.map(({who}) =>
          who.urls.map(url =>
            relation('linkExternalAsIcon', url)));
    }

    return relations;
  },

  data(contributions, {
    showContribution = false,
    showIcons = false,
  } = {}) {
    const data = {};

    data.contributionData =
      contributions.map(({who, what}) => ({
        hasContributionPart: !!(showContribution && what),
        hasExternalPart: !!(showIcons && !empty(who.urls)),
        contribution: showContribution && what,
      }));

    return data;
  },

  generate(data, relations, {
    html,
    language,
  }) {
    return language.formatConjunctionList(
      data.contributionData.map(({
        hasContributionPart,
        hasExternalPart,
        contribution,
      }, index) => {
        const artistLink = relations.artistLinks[index];
        const artistIcons = relations.artistIcons?.[index];

        const externalLinks = hasExternalPart &&
          html.tag('span',
            {[html.noEdgeWhitespace]: true, class: 'icons'},
            language.formatUnitList(artistIcons));

        return (
          (hasContributionPart
            ? (hasExternalPart
                ? language.$('misc.artistLink.withContribution.withExternalLinks', {
                    artist: artistLink,
                    contrib: contribution,
                    links: externalLinks,
                  })
                : language.$('misc.artistLink.withContribution', {
                    artist: artistLink,
                    contrib: contribution,
                  }))
            : (hasExternalPart
                ? language.$('misc.artistLink.withExternalLinks', {
                    artist: artistLink,
                    links: externalLinks,
                  })
                : language.$('misc.artistLink', {
                    artist: artistLink,
                  })))
        );
      }));
  },
};
