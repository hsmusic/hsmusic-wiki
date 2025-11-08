import {empty, filterMultipleArrays} from '#sugar';
import {sortAlbumsTracksChronologically, sortAlphabetically}
  from '#sort';

export default {
  sprawl: ({groupData, motifData}) =>
    ({groupData, motifData}),

  query({groupData, motifData}, spec) {
    const firstAppearance = motif =>
      (empty(motif.featuredInTracks)
        ? null
        : motif.featuredInTracks.at(0).track);

    const motifs = motifData.slice();

    // Multiple motifs may originate in the same track. These need an
    // unambiguous sort. It's just alphabetical here but could be
    // coded to match the order specified in Featured Motifs
    // (a manual order, meaning unambiguous).
    sortAlphabetically(motifs);

    const motifFirstAppearances =
      motifs.map(motif => firstAppearance(motif));

    // Filter out motifs which haven't been used at all.
    filterMultipleArrays(motifs, motifFirstAppearances,
      (_motif, firstAppearance) => firstAppearance);

    // This is what keeps the motifs whose first appearances implicitly
    // share an album, sorted preserving the album's track list order.
    // It also cleans up the ordering data and guarantees same-album
    // tracks (from the same date) are all in a row.
    sortAlbumsTracksChronologically(motifFirstAppearances);

    motifs.sort((a, b) =>
      motifFirstAppearances.indexOf(firstAppearance(a)) -
      motifFirstAppearances.indexOf(firstAppearance(b)));

    const groupMotifMap = new Map();

    // Initialize the map with empty arrays for each group.
    // This is most important just to ensure the final order of keys/values
    // stored within the map.
    for (const group of groupData) {
      groupMotifMap.set(group, []);
    }

    for (const motif of motifs) {
      for (const group of firstAppearance(motif).groups) {
        groupMotifMap.get(group).push(motif);
      }
    }

    const groups =
      Array.from(groupMotifMap.keys());

    const groupMotifs =
      Array.from(groupMotifMap.values());

    filterMultipleArrays(groups, groupMotifs,
      (_group, motifs) => !empty(motifs));

    return {spec, groups, groupMotifs};
  },

  relations: (relation, query) => ({
    page:
      relation('generateListingPage', query.spec),

    groupLinks:
      query.groups
        .map(group => relation('linkGroup', group)),

    motifLinks:
      query.groupMotifs
        .map(motifs => motifs
          .map(motif => relation('linkMotif', motif))),
  }),

  generate: (relations) =>
    relations.page.slots({
      type: 'chunks',

      chunkTitles:
        relations.groupLinks
          .map(groupLink => ({group: groupLink})),

      chunkRows:
        relations.motifLinks
          .map(motifLinks => motifLinks
            .map(motifLink => ({motif: motifLink}))),
    }),
};