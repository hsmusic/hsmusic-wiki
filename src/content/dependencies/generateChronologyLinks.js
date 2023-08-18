import {accumulateSum, empty} from '#sugar';

export default {
  extraDependencies: ['html', 'language'],

  slots: {
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

    const totalContributionCount =
      accumulateSum(
        slots.chronologyInfoSets,
        ({contributions}) => contributions.length);

    if (totalContributionCount === 0) {
      return html.blank();
    }

    if (totalContributionCount > 8) {
      return html.tag('div', {class: 'chronology'},
        language.$('misc.chronology.seeArtistPages'));
    }

    return html.tags(
      slots.chronologyInfoSets.map(({
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
                index: language.formatIndex(index),
                artist: artistLink,
              }));

          const navigation =
            (previousLink || nextLink) &&
              html.tag('span', {class: 'buttons'},
                language.formatUnitList([
                  previousLink?.slots({
                    tooltip: true,
                    color: false,
                    content: language.$('misc.nav.previous'),
                  }),

                  nextLink?.slots({
                    tooltip: true,
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
