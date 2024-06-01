import {sortAlbumsTracksChronologically, sortContributionsChronologically}
  from '#sort';
import {chunkByConditions, stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateArtistInfoPageChunkedList',
    'generateArtistInfoPageArtworksChunk',
  ],

  query(artist) {
    const query = {};

    const allContributions = [
      ...artist.albumCoverArtistContributions,
      ...artist.albumWallpaperArtistContributions,
      ...artist.albumBannerArtistContributions,
      ...artist.trackCoverArtistContributions,
    ];

    sortContributionsChronologically(
      allContributions,
      sortAlbumsTracksChronologically);

    query.contribs =
      chunkByConditions(allContributions, [
        ({date: date1}, {date: date2}) =>
          +date1 !== +date2,
        ({thing: thing1}, {thing: thing2}) =>
          (thing1.album ?? thing1) !==
          (thing2.album ?? thing2),
      ]);

    query.albums =
      query.contribs
        .map(contribs => contribs[0].thing)
        .map(thing => thing.album ?? thing);

    return query;
  },

  relations: (relation, query, _artist) => ({
    chunkedList:
      relation('generateArtistInfoPageChunkedList'),

    chunks:
      stitchArrays({
        album: query.albums,
        contribs: query.contribs,
      }).map(({album, contribs}) =>
          relation('generateArtistInfoPageArtworksChunk', album, contribs)),
  }),

  generate: (relations) =>
    relations.chunkedList.slots({
      chunks: relations.chunks,
    }),
};
