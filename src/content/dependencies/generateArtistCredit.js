import {empty} from '#sugar';

export default {
  contentDependencies: [
    'generateArtistCreditWikiEditsPart',
    'linkContribution',
  ],

  extraDependencies: ['html', 'language'],

  query: (contributions) => ({
    normalContributions:
      contributions
        .filter(contrib => !contrib.annotation?.startsWith(`edits for wiki`)),

    wikiEditContributions:
      contributions
        .filter(contrib => contrib.annotation?.startsWith(`edits for wiki`)),
  }),

  relations: (relation, query, _contributions) => ({
    contributionLinks:
      query.normalContributions
        .map(contrib => relation('linkContribution', contrib)),

    wikiEditsPart:
      relation('generateArtistCreditWikiEditsPart',
        query.wikiEditContributions),
  }),

  data: (query, _contributions) => ({
    hasWikiEdits:
      !empty(query.wikiEditContributions),
  }),

  slots: {
    showAnnotation: {type: 'boolean', default: true},
    showExternalLinks: {type: 'boolean', default: true},
    showChronology: {type: 'boolean', default: true},

    trimAnnotation: {type: 'boolean', default: false},

    chronologyKind: {type: 'string'},

    stringKey: {type: 'string'},
  },

  generate(data, relations, slots, {language}) {
    const contributionsList =
      language.formatConjunctionList(
        relations.contributionLinks.map(link =>
          link.slots({
            showAnnotation: slots.showAnnotation,
            showExternalLinks: slots.showExternalLinks,
            showChronology: slots.showChronology,

            trimAnnotation: slots.trimAnnotation,

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
                edits:
                  relations.wikiEditsPart.slots({
                    showAnnotation: slots.showAnnotation,
                  }),
              }))
          : contributionsList),
    });
  },
};
