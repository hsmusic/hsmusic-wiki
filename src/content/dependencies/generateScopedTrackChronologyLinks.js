import {sortAlbumsTracksChronologically} from '#sort';

import getChronologyRelations from '../util/getChronologyRelations.js';

export default {
  contentDependencies: [
    'generateChronologyLinks',
    'linkAlbum',
    'linkArtist',
    'linkTrack',
  ],

  relations(relation, album, track) {
    const albumFilter =
      (album
        ? track => track.album === album
        : () => true);

    return {
      chronologyLinks:
        relation('generateChronologyLinks'),

      artistChronologyContributions:
        getChronologyRelations(track, {
          contributions: [
            ...track.artistContribs ?? [],
            ...track.contributorContribs ?? [],
          ],

          linkArtist: artist => relation('linkArtist', artist),
          linkThing: track => relation('linkTrack', track),

          getThings(artist) {
            const getDate = thing => thing.date;

            const things =
              ([
                ...artist.tracksAsArtist,
                ...artist.tracksAsContributor,
              ]).filter(getDate)
                .filter(albumFilter);

            return sortAlbumsTracksChronologically(things, {getDate});
          },
        }),

      coverArtistChronologyContributions:
        getChronologyRelations(track, {
          contributions: track.coverArtistContribs ?? [],

          linkArtist: artist => relation('linkArtist', artist),

          linkThing: trackOrAlbum =>
            (trackOrAlbum.album
              ? relation('linkTrack', trackOrAlbum)
              : relation('linkAlbum', trackOrAlbum)),

          getThings(artist) {
            const getDate = thing => thing.coverArtDate ?? thing.date;

            const things =
              ([
                ...artist.albumsAsCoverArtist,
                ...artist.tracksAsCoverArtist,
              ]).filter(getDate)
                .filter(albumFilter);

            return sortAlbumsTracksChronologically(things, {getDate});
          },
        }),
    };
  },

  generate: (relations) =>
    relations.chronologyLinks.slots({
      showOnly: true,

      chronologyInfoSets: [
        {
          headingString: 'misc.chronology.heading.track',
          contributions: relations.artistChronologyContributions,
        },
        {
          headingString: 'misc.chronology.heading.coverArt',
          contributions: relations.coverArtistChronologyContributions,
        },
      ],
    }),
};
