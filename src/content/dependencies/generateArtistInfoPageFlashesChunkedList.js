import {sortContributionsChronologically, sortFlashesChronologically}
  from '#sort';
import {chunkByConditions, stitchArrays} from '#sugar';

export default {
  sprawl: ({wikiInfo}) => ({
    enableFlashesAndGames:
      wikiInfo.enableFlashesAndGames,
  }),

  query(sprawl, artist) {
    const query = {};

    const mockFeaturedTrackContributions =
      artist.trackArtistContributions
        .map(contrib => contrib.thing)
        .flatMap(track => track.ownFeaturedInFlashes
          .map(flash => ({
            isMockFeaturedTrackContribution: true,
            date: flash.date,
            thing: flash,
            artist,
            track,
          })));

    const allContributions =
      (sprawl.enableFlashesAndGames
        ? [
            ...artist.flashContributorContributions,
            ...mockFeaturedTrackContributions,
          ]
      : []);

    sortContributionsChronologically(
      allContributions,
      sortFlashesChronologically);

    query.contribs =
      chunkByConditions(allContributions, [
        ({thing: flash1}, {thing: flash2}) =>
          flash1.act !== flash2.act,
      ]).map(contribs =>
          chunkByConditions(contribs, [
            ({thing: flash1}, {thing: flash2}) =>
              flash1 !== flash2,
          ]));

    query.flashActs =
      query.contribs
        .map(contribs => contribs[0][0].thing)
        .map(thing => thing.act);

    return query;
  },

  relations: (relation, query, _sprawl, artist) => ({
    chunkedList:
      relation('generateArtistInfoPageChunkedList'),

    chunks:
      stitchArrays({
        flashAct: query.flashActs,
        contribs: query.contribs,
      }).map(({flashAct, contribs}) =>
          relation('generateArtistInfoPageFlashesChunk',
            artist,
            flashAct,
            contribs)),
  }),

  generate: (relations) =>
    relations.chunkedList.slots({
      chunks: relations.chunks,
    }),
};
