import {chunkByConditions, stitchArrays} from '#sugar';
import {sortAlbumsTracksChronologically, sortContributionsChronologically}
  from '#sort';

export default {
  query(artist) {
    const query = {};

    const allContributions = [
      ...artist.midiProjectFileArtistContributions,
    ];

    const getAdditionalFile = contrib =>
      contrib.thing;

    const getAlbumOrTrack = contrib =>
      getAdditionalFile(contrib).thing;

    sortContributionsChronologically(
      allContributions,
      sortAlbumsTracksChronologically,
      {getThing: getAlbumOrTrack});

    const getAlbum = contrib =>
      (getAlbumOrTrack(contrib).isTrack
        ? getAlbumOrTrack(contrib).album
        : getAlbumOrTrack(contrib));

    query.contribs =
      chunkByConditions(allContributions, [
        (a, b) => getAlbum(a) !== getAlbum(b),
      ]).map(contribs =>
          chunkByConditions(contribs, [
            (a, b) => getAdditionalFile(a) !== getAdditionalFile(b),
          ]));

    query.albums =
      query.contribs
        .map(contribs => contribs[0][0])
        .map(contrib => getAlbum(contrib));

    return query;
  },

  relations: (relation, query, artist) => ({
    template:
      relation('generateArtistInfoPageChunkedList'),

    chunks:
      stitchArrays({
        album: query.albums,
        contribs: query.contribs,
      }).map(({album, contribs}) =>
          relation('generateArtistInfoPageAdditionalFilesChunk',
            artist,
            album,
            contribs)),
  }),

  generate: (relations) =>
    relations.template.slots({
      chunks:
        relations.chunks.map(chunk =>
          chunk.slots({
            string: 'midiProjectFile',
          })),
    }),
};
