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
              only: v.isBoolean,
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
              .filter(({only}) => !only),
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
          only,
        }) => {
          const heading =
            html.tag('span', {class: 'heading'},
              language.$(headingString, {
                index:
                  (only
                    ? language.formatString('misc.chronology.heading.onlyIndex')
                    : language.formatIndex(index)),

                artist: artistLink,
              }));

          const navigation =
            !only &&
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
