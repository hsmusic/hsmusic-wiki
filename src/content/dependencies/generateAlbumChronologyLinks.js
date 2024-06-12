import {sortAlbumsTracksChronologically} from '#sort';

import getChronologyRelations from '../util/getChronologyRelations.js';

export default {
  contentDependencies: [
    'generateChronologyLinks',
    'linkAlbum',
    'linkArtist',
    'linkTrack',
  ],

  relations: (relation, album) => ({
    chronologyLinks:
      relation('generateChronologyLinks'),

    coverArtistChronologyContributions:
      getChronologyRelations(album, {
        contributions: album.coverArtistContribs ?? [],

        linkArtist: artist => relation('linkArtist', artist),

        linkThing: trackOrAlbum =>
          (trackOrAlbum.album
            ? relation('linkTrack', trackOrAlbum)
            : relation('linkAlbum', trackOrAlbum)),

        getThings(artist) {
          const getDate = thing => thing.coverArtDate ?? thing.date;

          const things =
            ([
              artist.albumCoverArtistContributions,
              artist.trackCoverArtistContributions,
            ]).flat()
              .map(({thing}) => thing)
              .filter(getDate);

          return sortAlbumsTracksChronologically(things, {getDate});
        },
      }),
  }),

  generate: (relations) =>
    relations.chronologyLinks.slots({
      chronologyInfoSets: [
        {
          headingString: 'misc.chronology.heading.coverArt',
          contributions: relations.coverArtistChronologyContributions,
        },
      ],
    }),
}
