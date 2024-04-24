import {sortAlbumsTracksChronologically, sortEntryThingPairs} from '#sort';
import {accumulateSum, chunkByProperties, empty, stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateArtistInfoPageChunk',
    'generateArtistInfoPageChunkedList',
    'generateArtistInfoPageChunkItem',
    'generateArtistInfoPageOtherArtistLinks',
    'linkAlbum',
    'linkTrack',
  ],

  extraDependencies: ['html', 'language'],

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

  relations(relation, query, artist) {
    return {
      chunkedList:
        relation('generateArtistInfoPageChunkedList'),

      chunks:
        query.chunks.map(() => relation('generateArtistInfoPageChunk')),

      albumLinks:
        query.chunks.map(({album}) => relation('linkAlbum', album)),

      items:
        query.chunks.map(({chunk}) =>
          chunk.map(() => relation('generateArtistInfoPageChunkItem'))),

      trackLinks:
        query.chunks.map(({chunk}) =>
          chunk.map(({track}) => relation('linkTrack', track))),

      trackOtherArtistLinks:
        query.chunks.map(({chunk}) =>
          chunk.map(({contribs}) => relation('generateArtistInfoPageOtherArtistLinks', contribs, artist))),
    };
  },

  data(query, artist) {
    return {
      chunkDates:
        query.chunks.map(({date}) => date),

      chunkDurations:
        query.chunks.map(({chunk}) =>
          accumulateSum(
            chunk
              .filter(({track}) => track.duration && track.originalReleaseTrack === null)
              .map(({track}) => track.duration))),

      chunkDurationsApproximate:
        query.chunks.map(({chunk}) =>
          chunk
            .filter(({track}) => track.duration && track.originalReleaseTrack === null)
            .length > 1),

      trackDurations:
        query.chunks.map(({chunk}) =>
          chunk.map(({track}) => track.duration)),

      trackContributions:
        query.chunks.map(({chunk}) =>
          chunk
            .map(({contribs}) =>
              contribs.filter(contrib => contrib.artist === artist))
            .map(ownContribs => ({
              creditedAsArtist:
                ownContribs
                  .some(({kind}) => kind === 'artist'),

              creditedAsContributor:
                ownContribs
                  .some(({kind}) => kind === 'contributor'),

              annotatedContribs:
                ownContribs
                  .filter(({annotation}) => annotation),
            }))
            .map(({annotatedContribs, ...rest}) => ({
              ...rest,

              annotatedArtistContribs:
                annotatedContribs
                  .filter(({kind}) => kind === 'artist'),

              annotatedContributorContribs:
                annotatedContribs
                  .filter(({kind}) => kind === 'contributor'),
            }))
            .map(({
              creditedAsArtist,
              creditedAsContributor,
              annotatedArtistContribs,
              annotatedContributorContribs,
            }) => {
              // Don't display annotations associated with crediting in the
              // Contributors field if the artist is also credited as an Artist
              // *and* the Artist-field contribution is non-annotated. This is
              // so that we don't misrepresent the artist - the contributor
              // annotation tends to be for "secondary" and performance roles.
              // For example, this avoids crediting Marcy Nabors on Renewed
              // Return seemingly only for "bass clarinet" when they're also
              // the one who composed and arranged Renewed Return!
              if (
                creditedAsArtist &&
                creditedAsContributor &&
                empty(annotatedArtistContribs)
              ) {
                return [];
              }

              return [
                ...annotatedArtistContribs,
                ...annotatedContributorContribs,
              ];
            })
            .map(contribs =>
              contribs.map(({annotation}) => annotation))
            .map(contributions =>
              (empty(contributions)
                ? null
                : contributions))),

      trackRereleases:
        query.chunks.map(({chunk}) =>
          chunk.map(({track}) => track.originalReleaseTrack !== null)),
    };
  },

  generate(data, relations, {html, language}) {
    return relations.chunkedList.slots({
      chunks:
        stitchArrays({
          chunk: relations.chunks,
          albumLink: relations.albumLinks,
          date: data.chunkDates,
          duration: data.chunkDurations,
          durationApproximate: data.chunkDurationsApproximate,

          items: relations.items,
          trackLinks: relations.trackLinks,
          trackOtherArtistLinks: relations.trackOtherArtistLinks,
          trackDurations: data.trackDurations,
          trackContributions: data.trackContributions,
          trackRereleases: data.trackRereleases,
        }).map(({
            chunk,
            albumLink,
            date,
            duration,
            durationApproximate,

            items,
            trackLinks,
            trackOtherArtistLinks,
            trackDurations,
            trackContributions,
            trackRereleases,
          }) =>
            chunk.slots({
              mode: 'album',
              albumLink,
              date,
              duration,
              durationApproximate,

              items:
                stitchArrays({
                  item: items,
                  trackLink: trackLinks,
                  otherArtistLinks: trackOtherArtistLinks,
                  duration: trackDurations,
                  contribution: trackContributions,
                  rerelease: trackRereleases,
                }).map(({
                    item,
                    trackLink,
                    otherArtistLinks,
                    duration,
                    contribution,
                    rerelease,
                  }) =>
                    item.slots({
                      otherArtistLinks,
                      rerelease,

                      annotation:
                        (contribution
                          ? language.formatUnitList(contribution)
                          : html.blank()),

                      content:
                        (duration
                          ? language.$('artistPage.creditList.entry.track.withDuration', {
                              track: trackLink,
                              duration: language.formatDuration(duration),
                            })
                          : language.$('artistPage.creditList.entry.track', {
                              track: trackLink,
                            })),
                    })),
            })),
    });
  },
};
