import {stitchArrays} from '#sugar';

export default {
  sprawl: ({groupData}) => ({
    // TODO: Series aren't their own things, so we access them weirdly.
    seriesData:
      groupData.flatMap(group => group.serieses),
  }),

  query(sprawl, album) {
    const query = {};

    query.groups =
      album.groups;

    query.groupSerieses =
      query.groups
        .map(group =>
          group.serieses
            .filter(series => series.albums.includes(album)));

    query.disconnectedSerieses =
      sprawl.seriesData
        .filter(series =>
          series.albums.includes(album) &&
          !query.groups.includes(series.group));

    return query;
  },

  relations: (relation, query, _sprawl, album) => ({
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

    disconnectedSeriesParts:
      query.disconnectedSerieses
        .map(series =>
          relation('generateAlbumSecondaryNavSeriesPart',
            series,
            album)),
  }),

  slots: {
    mode: {
      validate: v => v.is('album', 'track'),
      default: 'album',
    },

    alwaysVisible: {
      type: 'boolean',
      default: false,
    },
  },

  generate(relations, slots, {html}) {
    const groupConnectedParts =
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
                {[html.joinChildren]: ''},

                [groupPart, ...seriesParts]));
          }
        });

    const allParts = [
      ...relations.disconnectedSeriesParts,
      ...groupConnectedParts,
    ];

    return relations.secondaryNav.slots({
      alwaysVisible: slots.alwaysVisible,

      attributes: [
        {class: 'album-secondary-nav'},

        slots.mode === 'album' &&
          {class: 'with-previous-next'},
      ],

      content:
        (slots.mode === 'album'
          ? allParts
          : relations.switcher.slot('options', allParts)),
    });
  },
};
