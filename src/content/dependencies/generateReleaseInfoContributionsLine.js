import {empty} from '#sugar';

export default {
  contentDependencies: [
    'generateReleaseInfoContributionsLineWikiEditsPart',
    'linkContribution',
  ],

  extraDependencies: ['html', 'language'],

  query: (contributions) => ({
    normalContributions:
      contributions
        .filter(contrib => contrib.annotation !== 'edits for wiki'),

    wikiEditContributions:
      contributions
        .filter(contrib => contrib.annotation === 'edits for wiki'),
  }),

  relations: (relation, query, _contributions) => ({
    contributionLinks:
      query.normalContributions
        .map(contrib => relation('linkContribution', contrib)),

    wikiEditsPart:
      relation('generateReleaseInfoContributionsLineWikiEditsPart',
        query.wikiEditContributions),
  }),

  data: (query, _contributions) => ({
    hasWikiEdits:
      !empty(query.wikiEditContributions),
  }),

  slots: {
    showContribution: {type: 'boolean', default: true},
    showExternalLinks: {type: 'boolean', default: true},
    showChronology: {type: 'boolean', default: true},

    stringKey: {type: 'string'},
    chronologyKind: {type: 'string'},
  },

  generate(data, relations, slots, {language}) {
    const contributionsList =
      language.formatConjunctionList(
        relations.contributionLinks.map(link =>
          link.slots({
            showContribution: slots.showContribution,
            showExternalLinks: slots.showExternalLinks,
            showChronology: slots.showChronology,
            chronologyKind: slots.chronologyKind,
          })));

    return language.$(slots.stringKey, {
      [language.onlyIfOptions]: ['artists'],

      artists:
        (data.hasWikiEdits
          ? language.encapsulate('misc.artistLink.withEditsForWiki', capsule =>
              language.$(capsule, {
                // It's nonsense to display "+ edits" without
                // having any regular contributions, also.
                [language.onlyIfOptions]: ['artists'],

                artists: contributionsList,
                edits: relations.wikiEditsPart,
              }))
          : contributionsList),
    });
  },
};
