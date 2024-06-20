import {compareArrays, empty} from '#sugar';

export default {
  contentDependencies: [
    'generateArtistCreditWikiEditsPart',
    'linkContribution',
  ],

  extraDependencies: ['html', 'language'],

  query: (creditContributions, contextContributions) => {
    const query = {};

    const featuringFilter = contribution =>
      contribution.annotation === 'featuring';

    const wikiEditFilter = contribution =>
      contribution.annotation?.startsWith('edits for wiki');

    const normalFilter = contribution =>
      !featuringFilter(contribution) &&
      !wikiEditFilter(contribution);

    query.normalContributions =
      creditContributions.filter(normalFilter);

    query.featuringContributions =
      creditContributions.filter(featuringFilter);

    query.wikiEditContributions =
      creditContributions.filter(wikiEditFilter);

    const contextNormalContributions =
      contextContributions.filter(normalFilter);

    query.normalContributionsAreDifferent =
      !compareArrays(
        query.normalContributions.map(({artist}) => artist),
        contextNormalContributions.map(({artist}) => artist),
        {checkOrder: false});

    return query;
  },

  relations: (relation, query, _creditContributions, _contextContributions) => ({
    normalContributionLinks:
      query.normalContributions
        .map(contrib => relation('linkContribution', contrib)),

    featuringContributionLinks:
      query.featuringContributions
        .map(contrib => relation('linkContribution', contrib)),

    wikiEditsPart:
      relation('generateArtistCreditWikiEditsPart',
        query.wikiEditContributions),
  }),

  data: (query, _creditContributions, _contextContributions) => ({
    normalContributionsAreDifferent:
      query.normalContributionsAreDifferent,

    hasWikiEdits:
      !empty(query.wikiEditContributions),
  }),

  slots: {
    // This string is mandatory.
    normalStringKey: {type: 'string'},

    // This string is optional.
    // Without it, there's no special behavior for "featuring" credits.
    normalFeaturingStringKey: {type: 'string'},

    // This string is optional.
    // Without it, "featuring" credits will always be alongside main credits.
    // It won't be used if contextContributions isn't provided.
    featuringStringKey: {type: 'string'},

    showAnnotation: {type: 'boolean', default: false},
    showExternalLinks: {type: 'boolean', default: false},
    showChronology: {type: 'boolean', default: false},
    showWikiEdits: {type: 'boolean', default: false},

    trimAnnotation: {type: 'boolean', default: false},

    chronologyKind: {type: 'string'},
  },

  generate(data, relations, slots, {html, language}) {
    if (!slots.normalStringKey) return html.blank();

    for (const link of [
      ...relations.normalContributionLinks,
      ...relations.featuringContributionLinks,
    ]) {
      link.setSlots({
        showExternalLinks: slots.showExternalLinks,
        showChronology: slots.showChronology,
        trimAnnotation: slots.trimAnnotation,
        chronologyKind: slots.chronologyKind,
      });
    }

    for (const link of relations.normalContributionLinks) {
      link.setSlots({
        showAnnotation: slots.showAnnotation,
      });
    }

    for (const link of relations.featuringContributionLinks) {
      link.setSlots({
        showAnnotation: false,
      });
    }

    if (empty(relations.normalContributionLinks)) {
      return html.blank();
    }

    const artistsList =
      (data.hasWikiEdits && slots.showWikiEdits
        ? language.$('misc.artistLink.withEditsForWiki', {
            artists:
              language.formatConjunctionList(relations.normalContributionLinks),

            edits:
              relations.wikiEditsPart.slots({
                showAnnotation: slots.showAnnotation,
              }),
          })
        : language.formatConjunctionList(relations.normalContributionLinks));

    const featuringList =
      language.formatConjunctionList(relations.featuringContributionLinks);

    const everyoneList =
      language.formatConjunctionList([
        ...relations.normalContributionLinks,
        ...relations.featuringContributionLinks,
      ]);

    if (empty(relations.featuringContributionLinks)) {
      if (data.normalContributionsAreDifferent) {
        return language.$(slots.normalStringKey, {artists: artistsList});
      } else {
        return html.blank();
      }
    }

    if (data.normalContributionsAreDifferent && slots.normalFeaturingStringKey) {
      return language.$(slots.normalFeaturingStringKey, {
        artists: artistsList,
        featuring: featuringList,
      });
    } else if (slots.featuringStringKey) {
      return language.$(slots.featuringStringKey, {artists: featuringList});
    } else {
      return language.$(slots.normalStringKey, {artists: everyoneList});
    }
  },
};
