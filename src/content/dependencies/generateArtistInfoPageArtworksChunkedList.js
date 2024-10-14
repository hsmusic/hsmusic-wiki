import {sortAlbumsTracksChronologically, sortContributionsChronologically}
  from '#sort';
import {chunkByConditions, stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateArtistInfoPageChunkedList',
    'generateArtistInfoPageArtworksChunk',
  ],

  query(artist, filterEditsForWiki) {
    const query = {};

    const allContributions = [
      ...artist.albumCoverArtistContributions,
      ...artist.albumWallpaperArtistContributions,
      ...artist.albumBannerArtistContributions,
      ...artist.trackCoverArtistContributions,
    ];

    const filteredContributions =
      allContributions
        .filter(({annotation}) =>
          (filterEditsForWiki
            ? annotation?.startsWith(`edits for wiki`)
            : !annotation?.startsWith(`edits for wiki`)));

    sortContributionsChronologically(
      filteredContributions,
      sortAlbumsTracksChronologically);

    query.contribs =
      chunkByConditions(filteredContributions, [
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

  relations: (relation, query, _artist, _filterEditsForWiki) => ({
    chunkedList:
      relation('generateArtistInfoPageChunkedList'),

    chunks:
      stitchArrays({
        album: query.albums,
        contribs: query.contribs,
      }).map(({album, contribs}) =>
          relation('generateArtistInfoPageArtworksChunk', album, contribs)),
  }),

  data: (_query, _artist, filterEditsForWiki) => ({
    filterEditsForWiki,
  }),

  generate: (data, relations) =>
    relations.chunkedList.slots({
      chunks:
        relations.chunks.map(chunk =>
          chunk.slot('filterEditsForWiki', data.filterEditsForWiki)),
    }),
};
