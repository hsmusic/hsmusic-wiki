import {empty} from '../../util/sugar.js';

export default {
  contentDependencies: [
    'linkArtist',
  ],

  relations(relation, contributions) {
    const relations = {};

    relations.artistLinks =
      contributions.map(({who}) => relation('linkArtist', who));

    return relations;
  },

  data(contributions, {
    showContribution = false,
    showIcons = false,
  }) {
    const data = {};

    data.showContribution = showContribution;
    data.showIcons = showIcons;

    data.contributionData =
      contributions.map(({who, what}) => ({
        hasContributionPart: !!(showContribution && what),
        hasExternalPart: !!(showIcons && !empty(who.urls)),
        artistUrls: who.urls,
        contribution: showContribution && what,
      }));

    return data;
  },

  generate(data, relations, {
    html,
    iconifyURL,
    language,
  }) {
    return language.formatConjunctionList(
      data.contributionData.map(({
        hasContributionPart,
        hasExternalPart,
        artistUrls,
        contribution,
      }, index) => {
        const artistLink = relations.artistLinks[index];

        const externalLinks = hasExternalPart &&
          html.tag('span',
            {[html.noEdgeWhitespace]: true, class: 'icons'},
            language.formatUnitList(
              artistUrls.map(url => iconifyURL(url, {language}))));

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
