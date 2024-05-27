import {sortAlbumsTracksChronologically} from '#sort';
import {accumulateSum, stitchArrays} from '#sugar';

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

    const relations = {};

    relations.scopeSwitcher =
      relation('generateChronologyLinksScopeSwitcher');

    relations.wiki =
      getScopedRelations(null);

    relations.album =
      getScopedRelations(track.album);

    for (const setKey of [
      'artistChronologyContributions',
      'coverArtistChronologyContributions',
    ]) {
      const wikiSet = relations.wiki[setKey];
      const albumSet = relations.album[setKey];

      const wikiArtistDirectories =
        wikiSet
          .map(({artistDirectory}) => artistDirectory);

      albumSet.sort((a, b) =>
        (a.only === b.only && a.index === b.index
          ? (wikiArtistDirectories.indexOf(a.artistDirectory)
           - wikiArtistDirectories.indexOf(b.artistDirectory))
          : 0));
    }

    return relations;
  },

  generate(relations) {
    function slotScopedRelations({content, artworkHeadingString}) {
      return content.chronologyLinks.slots({
        showOnly: true,
        allowCollapsing: false,

        chronologyInfoSets: [
          {
            headingString: 'misc.chronology.heading.track',
            contributions: content.artistChronologyContributions,
          },
          {
            headingString: `misc.chronology.heading.${artworkHeadingString}`,
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

    const artworkHeadingStrings = [
      'coverArt',
      'trackArt',
    ];

    const totalContributionCount =
      Math.max(...
        contents.map(content =>
          accumulateSum([
            content.artistChronologyContributions,
            content.coverArtistChronologyContributions,
          ], contributions => contributions.length)));

    relations.scopeSwitcher.setSlots({
      scopes,

      open:
        totalContributionCount <= 5,

      contents:
        stitchArrays({
          content: contents,
          artworkHeadingString: artworkHeadingStrings,
        }).map(slotScopedRelations),
    });

    return relations.scopeSwitcher;
  },
};
