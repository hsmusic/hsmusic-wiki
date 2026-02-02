import {sortAlbumsTracksChronologically, sortContributionsChronologically}
  from '#sort';
import {stitchArrays} from '#sugar';
import {chunkArtistTrackContributions} from '#wiki-data';

export default {
  query(artist) {
    const query = {};

    const allContributions = [
      ...artist.albumArtistContributions,
      ...artist.trackArtistContributions,
      ...artist.trackContributorContributions,
    ];

    sortContributionsChronologically(
      allContributions,
      sortAlbumsTracksChronologically);

    query.contribs =
      chunkArtistTrackContributions(allContributions);

    query.albums =
      query.contribs
        .map(contribs => contribs[0][0].thing)
        .map(thing => thing.isTrack ? thing.album : thing);

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

  data: (query, _artist) => ({
    albumDirectories:
      query.albums
        .map(album => album.directory),

    albumChunkIndices:
      query.albums
        .reduce(([indices, map], album) => {
          if (map.has(album)) {
            const n = map.get(album);
            indices.push(n);
            map.set(album, n + 1);
          } else {
            indices.push(0);
            map.set(album, 1);
          }
          return [indices, map];
        }, [[], new Map()])
        [0],
  }),

  generate: (data, relations) =>
    relations.chunkedList.slots({
      chunks:
        stitchArrays({
          chunk: relations.chunks,
          albumDirectory: data.albumDirectories,
          albumChunkIndex: data.albumChunkIndices,
        }).map(({chunk, albumDirectory, albumChunkIndex}) =>
            chunk.slot('id', `tracks-${albumDirectory}-${albumChunkIndex}`)),
    }),
};
