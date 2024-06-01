import {sortContributionsChronologically, sortFlashesChronologically}
  from '#sort';
import {chunkByConditions, stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateArtistInfoPageChunkedList',
    'generateArtistInfoPageFlashesChunk',
  ],

  query(artist) {
    const query = {};

    const allContributions = [
      ...artist.flashContributorContributions,
    ];

    sortContributionsChronologically(
      allContributions,
      sortFlashesChronologically);

    query.contribs =
      chunkByConditions(allContributions, [
        ({thing: flash1}, {thing: flash2}) =>
          flash1.act !== flash2.act,
      ]);

    query.flashActs =
      query.contribs
        .map(contribs => contribs[0].thing)
        .map(thing => thing.act);

    return query;
  },

  relations: (relation, query, _artist) => ({
    chunkedList:
      relation('generateArtistInfoPageChunkedList'),

    chunks:
      stitchArrays({
        flashAct: query.flashActs,
        contribs: query.contribs,
      }).map(({flashAct, contribs}) =>
          relation('generateArtistInfoPageFlashesChunk', flashAct, contribs)),
  }),

  generate: (relations) =>
    relations.chunkedList.slots({
      chunks: relations.chunks,
    }),
};
