import {sortAlbumsTracksChronologically, sortContributionsChronologically}
  from '#sort';
import {chunkByConditions, stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateArtistInfoPageChunkedList',
    'generateArtistInfoPageTracksChunk',
  ],

  query(artist) {
    const query = {};

    const allContributions = [
      ...artist.trackArtistContributions,
      ...artist.trackContributorContributions,
    ];

    sortContributionsChronologically(
      allContributions,
      sortAlbumsTracksChronologically);

    query.contribs =
      // First chunk by (contribution) date and album.
      chunkByConditions(allContributions, [
        ({date: date1}, {date: date2}) =>
          +date1 !== +date2,
        ({thing: track1}, {thing: track2}) =>
          track1.album !== track2.album,
      ]).map(contribs =>
          // Then, *within* the boundaries of the existing chunks,
          // chunk contributions to the same thing together.
          chunkByConditions(contribs, [
            ({thing: thing1}, {thing: thing2}) =>
              thing1 !== thing2,
          ]));

    query.albums =
      query.contribs
        .map(contribs =>
          contribs[0][0].thing.album);

    return query;
  },

  relations: (relation, query, artist) => ({
    chunkedList:
      relation('generateArtistInfoPageChunkedList'),

    chunks:
      stitchArrays({
        album: query.albums,
        contribs: query.contribs,
      }).map(({album, contribs}) =>
          relation('generateArtistInfoPageTracksChunk',
            artist,
            album,
            contribs)),
  }),

  generate: (relations) =>
    relations.chunkedList.slots({
      chunks: relations.chunks,
    }),
};
