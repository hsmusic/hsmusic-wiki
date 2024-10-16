import {stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateAlbumSecondaryNavGroupPart',
    'generateAlbumSecondaryNavSeriesPart',
    'generateSecondaryNav',
  ],

  extraDependencies: ['html'],

  query(album) {
    const query = {};

    query.groups =
      album.groups;

    query.groupSerieses =
      query.groups
        .map(group =>
          group.serieses
            .filter(series => series.albums.includes(album)));

    return query;
  },

  relations: (relation, query, album) => ({
    secondaryNav:
      relation('generateSecondaryNav'),

    groupParts:
      query.groups
        .map(group =>
          relation('generateAlbumSecondaryNavGroupPart',
            group,
            album)),

    seriesParts:
      query.groupSerieses
        .map(serieses => serieses
          .map(series =>
            relation('generateAlbumSecondaryNavSeriesPart',
              series,
              album))),
  }),

  slots: {
    mode: {
      validate: v => v.is('album', 'track'),
      default: 'album',
    },
  },

  generate: (relations, slots) =>
    relations.secondaryNav.slots({
      class: 'nav-links-groups',
      content:
        stitchArrays({
          groupPart: relations.groupParts,
          seriesParts: relations.seriesParts,
        }).map(({groupPart, seriesParts}) => [
            groupPart.slot('mode', slots.mode),

            seriesParts
              .map(part => part.slot('mode', slots.mode)),
          ]),
    }),
};
