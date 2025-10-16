import {sortAlphabetically} from '#sort';

export default {
  contentDependencies: ['generateListingPage', 'linkMotif'],
  extraDependencies: ['wikiData'],

  sprawl({motifData}) {
    return {motifData};
  },

  query({motifData}, spec) {
    // console.log(arguments)
    return {
      spec,
      motifs: sortAlphabetically(motifData.slice()),
    };
  },

  relations(relation, query) {
    return {
      page: relation('generateListingPage', query.spec),

      motifLinks:
        query.motifs
          .map(motif => relation('linkMotif', motif)),
    };
  },

  generate(relations) {
    // console.log(arguments)
    return relations.page.slots({
      type: 'rows',
      rows:
        relations.motifLinks
          .map(link => ({motif: link})),
    });
  },
};
