import {sortAlbumsTracksChronologically} from '#sort';
import {stitchArrays, transposeArrays, unique} from '#sugar';
import {compareKebabCase} from '#wiki-data';

export default {
  sprawl: ({seriesData}) => ({seriesData}),

  query(sprawl, album, track) {
    const query = {};

    query.groups =
      (track ? unique([...track.ownGroups, ...track.groups]) :
       album.groups);

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

    if (track) {
      const albumTrackMap =
        new Map(transposeArrays([
          track.allReleases.map(t => t.album),
          track.allReleases,
        ]));

      const allReleaseAlbums =
        sortAlbumsTracksChronologically(
          Array.from(albumTrackMap.keys()),
          {getDate: album => albumTrackMap.get(album).date});

      const metaLike =
        (album.style === 'meta'
          ? album => album.style === 'meta'
          : album => album.style !== 'meta');

      const metaUnlike =
        (album.style === 'meta'
          ? album => album.style !== 'meta'
          : album => album.style === 'meta');

      const metaReleaseAlbums =
        allReleaseAlbums.filter(metaUnlike);

      const regularReleaseAlbums =
        allReleaseAlbums.filter(metaLike);

      const currentReleaseIndex =
        regularReleaseAlbums.indexOf(track.album);

      const earlierReleaseAlbums =
        regularReleaseAlbums.slice(0, currentReleaseIndex);

      const laterReleaseAlbums =
        regularReleaseAlbums.slice(currentReleaseIndex + 1);

      query.earlierReleaseTracks =
        earlierReleaseAlbums.map(album => albumTrackMap.get(album));

      query.laterReleaseTracks =
        laterReleaseAlbums.map(album => albumTrackMap.get(album));

      query.metaReleaseTracks =
        metaReleaseAlbums.map(album => albumTrackMap.get(album));
    }

    return query;
  },

  relations: (relation, query, _sprawl, album, track) => ({
    sidebar:
      relation('generatePageSidebar'),

    trackListBox:
      relation('generateAlbumSidebarTrackListBox', album, track),

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

    earlierTrackReleaseBoxes:
      (track
        ? query.earlierReleaseTracks
            .map(track =>
              relation('generateTrackReleaseBox', track))
        : null),

    laterTrackReleaseBoxes:
      (track
        ? query.laterReleaseTracks
            .map(track =>
              relation('generateTrackReleaseBox', track))
        : null),

    metaReleaseBoxes:
      (track
        ? query.metaReleaseTracks
            .map(track =>
              relation('generateTrackReleaseBox', track))
        : null),
  }),

  data: (query, _sprawl, album, track) => ({
    isAlbumPage: !track,
    isTrackPage: !!track,

    albumStyle: album.style,

    seriesBoxesResembleGroup:
      stitchArrays({
        group: query.groups,
        serieses: query.groupSerieses,
      }).map(({group, serieses}) =>
          serieses.map(series =>
            compareKebabCase(series.name, group.name))),

    groupsCollapse:
      query.groups
        .map(group => group.collapseInAlbumSidebars),
  }),

  generate(data, relations, {html}) {
    const presentGroupsLikeAlbum =
      data.isAlbumPage ||
      data.albumStyle === 'single';

    for (const box of [
      ...relations.groupBoxes,
      ...relations.seriesBoxes.flat(),
      ...relations.disconnectedSeriesBoxes,
    ]) {
      box.setSlot('mode', presentGroupsLikeAlbum ? 'album' : 'track');
    }

    const groupBoxes = [
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
              (groupCollapses || data.isTrackPage) &&
                groupColorStyle.slot('context', 'primary-only'),

              {class: 'hide-for-narrow-layout'}),

            seriesBox,
          ]),
        ]),
    ];

    return relations.sidebar.slots({
      boxes: [
        data.isAlbumPage &&
          groupBoxes,

        data.isTrackPage &&
          relations.earlierTrackReleaseBoxes,

        relations.trackListBox,

        data.isTrackPage &&
          relations.laterTrackReleaseBoxes,

        data.isTrackPage &&
          relations.metaReleaseBoxes
            .map(box => box.slot('meta', true)),

        data.isTrackPage &&
        !html.isBlank(groupBoxes) &&
        !html.isBlank(relations.trackListBox) &&
          html.tag('hr'),

        data.isTrackPage &&
          groupBoxes,
      ],
    });
  },
};
