export default {
  contentDependencies: [
    'generateAlbumSidebarGroupBox',
    'generateAlbumSidebarTrackListBox',
    'generatePageSidebar',
    'generatePageSidebarConjoinedBox',
  ],

  relations: (relation, album, track) => ({
    sidebar:
      relation('generatePageSidebar'),

    conjoinedBox:
      relation('generatePageSidebarConjoinedBox'),

    trackListBox:
      relation('generateAlbumSidebarTrackListBox', album, track),

    groupBoxes:
      album.groups.map(group =>
        relation('generateAlbumSidebarGroupBox', album, group)),
  }),

  data: (album, track) => ({
    isAlbumPage: !track,
  }),

  generate: (data, relations) =>
    relations.sidebar.slots({
      boxes: [
        data.isAlbumPage &&
          relations.groupBoxes
            .map(box => box.slot('mode', 'album')),

        relations.trackListBox,

        !data.isAlbumPage &&
          relations.conjoinedBox.slots({
            attributes: {class: 'conjoined-group-sidebar-box'},
            boxes:
              relations.groupBoxes
                .map(box => box.slot('mode', 'track'))
                .map(box => box.content), /* TODO: Kludge. */
          }),
      ],
    }),
};
