import {stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateAlbumSidebarGroupBox',
    'generateAlbumSidebarSeriesBox',
    'generateAlbumSidebarTrackListBox',
    'generatePageSidebar',
    'generatePageSidebarConjoinedBox',
    'generateTrackReleaseBox',
  ],

  extraDependencies: ['html', 'wikiData'],

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

    trackReleaseBoxes:
      track.otherReleases
        .map(track =>
          relation('generateTrackReleaseBox', track)),
  }),

  data: (_query, _sprawl, _album, track) => ({
    isAlbumPage: !track,
    isTrackPage: !!track,
  }),

  generate(data, relations, {html}) {
    for (const box of [
      ...relations.groupBoxes,
      ...relations.seriesBoxes.flat(),
      ...relations.disconnectedSeriesBoxes,
    ]) {
      box.setSlot('mode',
        data.isAlbumPage ? 'album' : 'track');
    }

    return relations.sidebar.slots({
      boxes: [
        data.isAlbumPage && [
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
        ],

        data.isTrackPage &&
          relations.trackReleaseBoxes,

        relations.trackListBox,

        data.isTrackPage &&
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
          }),
      ],
    });
  },
};
