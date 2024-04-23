import {sortAlbumsTracksChronologically} from '#sort';
import {accumulateSum} from '#sugar';

import getChronologyRelations from '../util/getChronologyRelations.js';

export default {
  contentDependencies: [
    'generateChronologyLinks',
    'generateChronologyLinksScopeSwitcher',
    'linkAlbum',
    'linkArtist',
    'linkTrack',
  ],

  relations(relation, track) {
    function getScopedRelations(album) {
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
    }

    return {
      scopeSwitcher:
        relation('generateChronologyLinksScopeSwitcher'),

      wiki:
        getScopedRelations(null),

      album:
        getScopedRelations(track.album),
    };
  },

  generate(relations) {
    function slotScopedRelations(content) {
      return content.chronologyLinks.slots({
        showOnly: true,
        allowCollapsing: false,

        chronologyInfoSets: [
          {
            headingString: 'misc.chronology.heading.track',
            contributions: content.artistChronologyContributions,
          },
          {
            headingString: 'misc.chronology.heading.coverArt',
            contributions: content.coverArtistChronologyContributions,
          },
        ],
      });
    }

    const scopes = [
      'wiki',
      'album',
    ];

    const contents = [
      relations.wiki,
      relations.album,
    ];

    const totalContributionCount =
      accumulateSum(
        contents.flatMap(content => [
          content.artistChronologyContributions,
          content.coverArtistChronologyContributions,
        ]),
        contributions => contributions.length);

    relations.scopeSwitcher.setSlots({
      scopes,

      open:
        totalContributionCount <= 5,

      contents:
        contents.map(content => slotScopedRelations(content))
    });

    return relations.scopeSwitcher;
  },
};
