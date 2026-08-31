import {atOffset} from '#sugar';

export default {
  sprawl: ({motifData}) =>
    ({motifData}),

  query(sprawl, motif) {
    const query = {};

    const index =
      (motif
        ? sprawl.motifData.indexOf(motif)
        : null);

    query.previousMotif =
      (motif
        ? atOffset(sprawl.motifData, index, -1)
        : null);

    query.nextMotif =
      (motif
        ? atOffset(sprawl.motifData, index, +1)
        : null);

    return query;
  },

  relations: (relation, query, _sprawl, _motif) => ({
    switcher:
      relation('generateInterpageDotSwitcher'),

    previousLink:
      relation('generatePreviousLink'),

    nextLink:
      relation('generateNextLink'),

    previousMotifLink:
      (query.previousMotif
        ? relation('linkMotif', query.previousMotif)
        : null),

    nextMotifLink:
      (query.nextMotif
        ? relation('linkMotif', query.nextMotif)
        : null),
  }),

  generate: (relations) =>
    relations.switcher.slots({
      links: [
        relations.previousLink
          .slot('link', relations.previousMotifLink),

        relations.nextLink
          .slot('link', relations.nextMotifLink),
      ],
    }),
};
