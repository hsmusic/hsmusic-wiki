export default {
  contentDependencies: [
    'generateAlbumSidebarTrackSection',
    'generatePageSidebarBox',
    'linkAlbum',
  ],

  extraDependencies: ['html'],

  relations: (relation, album, track) => ({
    box:
      relation('generatePageSidebarBox'),

    albumLink:
      relation('linkAlbum', album),

    trackSections:
      album.trackSections.map(trackSection =>
        relation('generateAlbumSidebarTrackSection', album, track, trackSection)),
  }),

  data: (album) => ({
    albumStyle: album.style,
  }),

  generate: (data, relations, {html}) =>
    relations.box.slots({
      attributes: {class: 'track-list-sidebar-box'},

      content: [
        html.tag('h1', {[html.onlyIfSiblings]: true},
          relations.albumLink),

        relations.trackSections,
      ],
    })
};
