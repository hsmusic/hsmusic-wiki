import {sortAlbumsTracksChronologically, sortEntryThingPairs} from '#sort';
import {chunkByProperties, stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateArtistInfoPageChunkedList',
    'generateArtistInfoPageTracksChunk',
  ],

  query(artist) {
    const processTrackEntry = ({track, contribs}) => ({
      thing: track,
      entry: {
        track: track,
        album: track.album,
        date: track.date,
        contribs: contribs,
      },
    });

    const processTrackEntries = ({tracks, contribs}) =>
      stitchArrays({
        track: tracks,
        contribs: contribs,
      }).map(processTrackEntry);

    const {tracksAsArtist, tracksAsContributor} = artist;

    const tracksAsArtistAndContributor =
      tracksAsArtist
        .filter(track => tracksAsContributor.includes(track));

    const tracksAsArtistOnly =
      tracksAsArtist
        .filter(track => !tracksAsContributor.includes(track));

    const tracksAsContributorOnly =
      tracksAsContributor
        .filter(track => !tracksAsArtist.includes(track));

    const tracksAsArtistAndContributorContribs =
      tracksAsArtistAndContributor
        .map(track => [
          ...
            track.artistContribs
              .map(contrib => ({...contrib, kind: 'artist'})),
          ...
            track.contributorContribs
              .map(contrib => ({...contrib, kind: 'contributor'})),
        ]);

    const tracksAsArtistOnlyContribs =
      tracksAsArtistOnly
        .map(track => track.artistContribs
          .map(contrib => ({...contrib, kind: 'artist'})));

    const tracksAsContributorOnlyContribs =
      tracksAsContributorOnly
        .map(track => track.contributorContribs
          .map(contrib => ({...contrib, kind: 'contributor'})));

    const tracksAsArtistAndContributorEntries =
      processTrackEntries({
        tracks: tracksAsArtistAndContributor,
        contribs: tracksAsArtistAndContributorContribs,
      });

    const tracksAsArtistOnlyEntries =
      processTrackEntries({
        tracks: tracksAsArtistOnly,
        contribs: tracksAsArtistOnlyContribs,
      });

    const tracksAsContributorOnlyEntries =
      processTrackEntries({
        tracks: tracksAsContributorOnly,
        contribs: tracksAsContributorOnlyContribs,
      });

    const entries = [
      ...tracksAsArtistAndContributorEntries,
      ...tracksAsArtistOnlyEntries,
      ...tracksAsContributorOnlyEntries,
    ];

    sortEntryThingPairs(entries, sortAlbumsTracksChronologically);

    const chunks =
      chunkByProperties(
        entries.map(({entry}) => entry),
        ['album', 'date']);

    return {chunks};
  },

  relations: (relation, query, artist) => ({
    chunkedList:
      relation('generateArtistInfoPageChunkedList'),

    chunks:
      query.chunks.map(({chunk, album}) =>
        relation('generateArtistInfoPageTracksChunk',
          artist,
          album,
          chunk.map(entry => entry.track),
          chunk.map(entry => entry.contribs))),
  }),

  generate: (relations) =>
    relations.chunkedList.slots({
      chunks: relations.chunks,
    }),
};
