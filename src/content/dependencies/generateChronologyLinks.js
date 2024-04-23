import {accumulateSum, empty} from '#sugar';

export default {
  extraDependencies: ['html', 'language'],

  slots: {
    showOnly: {
      type: 'boolean',
      default: false,
    },

    chronologyInfoSets: {
      validate: v =>
        v.strictArrayOf(
          v.validateProperties({
            headingString: v.isString,
            contributions: v.strictArrayOf(v.validateProperties({
              index: v.isCountingNumber,
              artistLink: v.isHTML,
              previousLink: v.isHTML,
              nextLink: v.isHTML,
            })),
          })),
    }
  },

  generate(slots, {html, language}) {
    if (empty(slots.chronologyInfoSets)) {
      return html.blank();
    }

    let infoSets = slots.chronologyInfoSets;

    if (!slots.showOnly) {
      infoSets = infoSets
        .map(({contributions, ...entry}) => ({
          ...entry,
          contributions:
            contributions
              .filter(({nextLink, previousLink}) =>
                nextLink || previousLink),
        }))
        .filter(({contributions}) => !empty(contributions));
    }

    const totalContributionCount =
      accumulateSum(
        infoSets,
        ({contributions}) => contributions.length);

    if (totalContributionCount === 0) {
      return html.blank();
    }

    if (totalContributionCount > 8) {
      return html.tag('div', {class: 'chronology'},
        language.$('misc.chronology.seeArtistPages'));
    }

    return html.tags(
      infoSets.map(({
        headingString,
        contributions,
      }) =>
        contributions.map(({
          index,
          artistLink,
          previousLink,
          nextLink,
        }) => {
          const heading =
            html.tag('span', {class: 'heading'},
              language.$(headingString, {
                index:
                  (previousLink || nextLink
                    ? language.formatIndex(index)
                    : language.formatString('misc.chronology.heading.onlyIndex')),

                artist: artistLink,
              }));

          const navigation =
            (previousLink || nextLink) &&
              html.tag('span', {class: 'buttons'},
                language.formatUnitList([
                  previousLink?.slots({
                    tooltipStyle: 'browser',
                    color: false,
                    content: language.$('misc.nav.previous'),
                  }),

                  nextLink?.slots({
                    tooltipStyle: 'browser',
                    color: false,
                    content: language.$('misc.nav.next'),
                  }),
                ].filter(Boolean)));

          return html.tag('div', {class: 'chronology'},
            (navigation
              ? language.$('misc.chronology.withNavigation', {heading, navigation})
              : heading));
        })));
  },
};
