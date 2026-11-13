import {stitchArrays} from '#sugar';

export default {
  sprawl: ({seriesData}) => ({seriesData}),

  query(sprawl, album, track) {
    const thing = track ?? album;
    const groups = track ? track.ownGroups : album.groups;

    const groupSerieses =
      groups
        .map(group => group.serieses
          .filter(series => series.things.includes(thing)));

    const allGroupSerieses =
      groupSerieses.flat();

    const disconnectedSerieses =
      sprawl.seriesData
        .filter(series => series.things.includes(thing))
        .filter(series => !allGroupSerieses.includes(series));

    return {groups, groupSerieses, disconnectedSerieses};
  },

  relations: (relation, query, _sprawl, album, track) => ({
    groupBoxes:
      query.groups
        .map(group =>
          relation('generateAlbumSidebarGroupBox', album, track, group)),

    groupColorStyles:
      query.groups
        .map(group => relation('generateColorStyleAttribute', group.color)),

    seriesBoxes:
      query.groupSerieses
        .map(serieses => serieses
          .map(series =>
            relation('generateAlbumSidebarSeriesBox', album, track, series))),

    disconnectedSeriesBoxes:
      query.disconnectedSerieses
        .map(series =>
          relation('generateAlbumSidebarSeriesBox', album, track, series)),
  }),

  data: (query, _sprawl, _album, _track) => ({
    groupsCollapse:
      query.groups
        .map(group => group.collapseInAlbumSidebars),
  }),

  slots: {
    mode: {
      validate: v => v.is('album', 'track'),
      default: 'track',
    },
  },

  generate(data, relations, slots, {html}) {
    for (const box of [
      ...relations.groupBoxes,
      ...relations.seriesBoxes.flat(),
      ...relations.disconnectedSeriesBoxes,
    ]) {
      box.setSlot('mode', slots.mode);
    }

    return html.tags([
      relations.disconnectedSeriesBoxes,

      stitchArrays({
        groupBox: relations.groupBoxes,
        groupColorStyle: relations.groupColorStyles,
        seriesBoxes: relations.seriesBoxes,
        groupCollapses: data.groupsCollapse,
      }).map(({
          groupBox,
          groupColorStyle,
          seriesBoxes,
          groupCollapses,
        }) => [
          groupBox,
          seriesBoxes.map(seriesBox => [
            html.tag('div', {class: 'sidebar-box-joiner'},
              (groupCollapses || slots.mode === 'track') &&
                groupColorStyle.slot('context', 'primary-only'),

              {class: 'hide-for-narrow-layout'}),

            seriesBox,
          ]),
        ]),
    ]);
  },
};
