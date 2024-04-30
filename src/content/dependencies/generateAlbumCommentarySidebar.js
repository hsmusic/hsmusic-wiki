export default {
  contentDependencies: [
    'generateAlbumSidebarTrackSection',
    'generatePageSidebar',
    'generatePageSidebarBox',
    'linkAlbum',
  ],

  extraDependencies: ['html'],

  relations: (relation, album) => ({
    sidebar:
      relation('generatePageSidebar'),

    sidebarBox:
      relation('generatePageSidebarBox'),

    albumLink:
      relation('linkAlbum', album),

    trackSections:
      album.trackSections.map(trackSection =>
        relation('generateAlbumSidebarTrackSection',
          album,
          null,
          trackSection)),
  }),

  generate: (relations, {html}) =>
    relations.sidebar.slots({
      stickyMode: 'column',
      boxes: [
        relations.sidebarBox.slots({
          attributes: {class: 'commentary-track-list-sidebar-box'},
          content: [
            html.tag('h1', relations.albumLink),
            relations.trackSections.map(section =>
              section.slots({
                anchor: true,
                open: true,
                mode: 'commentary',
              })),
          ],
        }),
      ]
    }),
}
