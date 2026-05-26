export default {
  relations: (relation, album, track) => ({
    box:
      relation('generatePageSidebarBox'),

    albumLink:
      relation('linkAlbum', album),

    trackSections:
      album.trackSections.map(trackSection =>
        relation('generateAlbumSidebarTrackSection', album, track, trackSection)),
  }),

  generate: (relations, {html}) =>
    relations.box.slots({
      attributes: {class: 'track-list-sidebar-box'},

      content: [
        html.tag('h1', {[html.onlyIfSiblings]: true},
          relations.albumLink.slots({
            showNameDetail: 'inside',
          })),

        relations.trackSections,
      ],
    })
};
