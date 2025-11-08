import {sortAlphabetically, sortByCount} from '#sort';
import {filterByCount, stitchArrays, unique} from '#sugar';

export default {
  sprawl: ({motifData}) =>
    ({motifData}),

  query({motifData}, spec) {
    const motifs =
      sortAlphabetically(
        motifData
          .filter(motif => !motif.isContentWarning));

    const counts =
      motifs.map(motif =>
        unique([
          ...motif.featuredInTracks,
        ]).length);

    filterByCount(motifs, counts);
    sortByCount(motifs, counts, {greatestFirst: true});

    return {spec, motifs, counts};
  },

  relations: (relation, query) => ({
    page:
      relation('generateListingPage', query.spec),

    motifLinks:
      query.motifs
        .map(motif => relation('linkMotif', motif)),
  }),

  data: (query) =>
    ({counts: query.counts}),

  generate: (data, relations, {language}) =>
    relations.page.slots({
      type: 'rows',
      rows:
        stitchArrays({
          link: relations.motifLinks,
          count: data.counts,
        }).map(({link, count}) => ({
            motif: link,
            timesUsed: language.countTimesUsed(count, {unit: true}),
          })),
    }),
};
