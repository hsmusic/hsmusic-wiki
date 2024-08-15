import {stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateAlbumSecondaryNavGroupPart',
    'generateAlbumSecondaryNavSeriesPart',
    'generateDotSwitcherTemplate',
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

    // Just use a generic dot switcher here. We want the common behavior,
    // but the "options" may each contain multiple links (group + series),
    // so this is a different use than typical interpage dot switchers.
    switcher:
      relation('generateDotSwitcherTemplate'),

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

  generate(relations, slots, {html}) {
    const allParts =
      stitchArrays({
        groupPart: relations.groupParts,
        seriesParts: relations.seriesParts,
      }).map(({groupPart, seriesParts}) => {
          for (const part of [groupPart, ...seriesParts]) {
            part.setSlot('mode', slots.mode);
          }

          if (html.isBlank(seriesParts)) {
            return groupPart;
          } else {
            return (
              html.tag('span', {class: 'group-with-series'},
                [groupPart, ...seriesParts]));
          }
        });

    return relations.secondaryNav.slots({
      class: [
        'album-secondary-nav',

        slots.mode === 'album' &&
          'with-previous-next',
      ],

      content:
        (slots.mode === 'album'
          ? allParts
          : relations.switcher.slot('options', allParts)),
    });
  },
};
