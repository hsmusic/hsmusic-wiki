import {stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateAlbumSidebarGroupBox',
    'generateAlbumSidebarSeriesBox',
    'generateAlbumSidebarTrackListBox',
    'generatePageSidebar',
    'generatePageSidebarConjoinedBox',
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

  relations: (relation, query, album, track) => ({
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
  }),

  data: (_query, _album, track) => ({
    isAlbumPage: !track,
  }),

  generate(data, relations, {html}) {
    for (const box of [
      ...relations.groupBoxes,
      ...relations.seriesBoxes.flat(),
    ]) {
      box.setSlot('mode',
        data.isAlbumPage ? 'album' : 'track');
    }

    const groupAndSeriesBoxes =
      stitchArrays({
        groupBox: relations.groupBoxes,
        seriesBoxes: relations.seriesBoxes,
      }).map(({groupBox, seriesBoxes}) =>
          [groupBox].concat(
            seriesBoxes.map(seriesBox => [
              html.tag('div',
                {class: 'sidebar-box-joiner'},
                {class: 'collapsible'}),
              seriesBox,
            ])))
        .flat();

    return relations.sidebar.slots({
      boxes: [
        data.isAlbumPage &&
          groupAndSeriesBoxes,

        relations.trackListBox,

        !data.isAlbumPage &&
          relations.conjoinedBox.slots({
            attributes: {class: 'conjoined-group-sidebar-box'},
            boxes:
              groupAndSeriesBoxes
                .map(box => box.content), /* TODO: Kludge. */
          }),
      ],
    });
  }
};
