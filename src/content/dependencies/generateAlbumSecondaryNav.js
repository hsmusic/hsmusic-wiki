import {stitchArrays} from '#sugar';

export default {
  sprawl: ({seriesData}) => ({seriesData}),

  query(sprawl, album, track) {
    const query = {};

    query.groups =
      (track ? track.groups : album.groups);

    const includedInSeries = series =>
      series.things.includes(album) ||
      series.things.includes(track);

    query.groupSerieses =
      query.groups
        .map(group =>
          group.serieses
            .filter(series => includedInSeries(series)));

    const allGroupSerieses =
      query.groupSerieses.flat();

    query.disconnectedSerieses =
      sprawl.seriesData
        .filter(series => includedInSeries(series))
        .filter(series => !allGroupSerieses.includes(series));

    return query;
  },

  relations: (relation, query, _sprawl, album, track) => ({
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
              album,
              track))),

    disconnectedSeriesParts:
      query.disconnectedSerieses
        .map(series =>
          relation('generateAlbumSecondaryNavSeriesPart',
            series,
            album,
            track)),
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

    const disconnectedSeriesParts =
      relations.disconnectedSeriesParts.map(seriesPart => {
        seriesPart.setSlot('mode', slots.mode);
        return seriesPart;
      });

    const allParts = [
      ...disconnectedSeriesParts,
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
