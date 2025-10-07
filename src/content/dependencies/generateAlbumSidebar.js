import {sortAlbumsTracksChronologically} from '#sort';
import {stitchArrays, transposeArrays} from '#sugar';

export default {
  sprawl: ({groupData}) => ({
    // TODO: Series aren't their own things, so we access them weirdly.
    seriesData:
      groupData.flatMap(group => group.serieses),
  }),

  query(sprawl, album, track) {
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

      const currentReleaseIndex =
        allReleaseAlbums.indexOf(track.album);

      const earlierReleaseAlbums =
        allReleaseAlbums.slice(0, currentReleaseIndex);

      const laterReleaseAlbums =
        allReleaseAlbums.slice(currentReleaseIndex + 1);

      query.earlierReleaseTracks =
        earlierReleaseAlbums.map(album => albumTrackMap.get(album));

      query.laterReleaseTracks =
        laterReleaseAlbums.map(album => albumTrackMap.get(album));
    }

    return query;
  },

  relations: (relation, query, _sprawl, album, track) => ({
    sidebar:
      relation('generatePageSidebar'),

    conjoinedBox:
      relation('generatePageSidebarConjoinedBox'),

    trackListBox:
      relation('generateAlbumSidebarTrackListBox', album, track),

    groupBoxes:
      query.groups
        .map(group =>
          relation('generateAlbumSidebarGroupBox', album, group)),

    seriesBoxes:
      query.groupSerieses
        .map(serieses => serieses
          .map(series =>
            relation('generateAlbumSidebarSeriesBox', album, series))),

    disconnectedSeriesBoxes:
      query.disconnectedSerieses
        .map(series =>
          relation('generateAlbumSidebarSeriesBox', album, series)),

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
  }),

  data: (_query, _sprawl, album, track) => ({
    isAlbumPage: !track,
    isTrackPage: !!track,

    albumStyle: album.style,
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

    const groupBoxes =
      (presentGroupsLikeAlbum
        ? [
            relations.disconnectedSeriesBoxes,

            stitchArrays({
              groupBox: relations.groupBoxes,
              seriesBoxes: relations.seriesBoxes,
            }).map(({groupBox, seriesBoxes}) => [
                groupBox,
                seriesBoxes.map(seriesBox => [
                  html.tag('div',
                    {class: 'sidebar-box-joiner'},
                    {class: 'collapsible'}),
                  seriesBox,
                ]),
              ]),
          ]
        : [
            relations.conjoinedBox.slots({
              attributes: {class: 'conjoined-group-sidebar-box'},
              boxes:
                ([relations.disconnectedSeriesBoxes,
                  stitchArrays({
                    groupBox: relations.groupBoxes,
                    seriesBoxes: relations.seriesBoxes,
                  }).flatMap(({groupBox, seriesBoxes}) => [
                      groupBox,
                      ...seriesBoxes,
                    ]),
                ]).flat()
                  .map(box => box.content), /* TODO: Kludge. */
            })
          ]);

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
          groupBoxes,
      ],
    });
  },
};
