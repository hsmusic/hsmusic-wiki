export default {
  relations: (relation, album, track) => ({
    box:
      relation('generatePageSidebarBox'),

    albumLink:
      relation('linkAlbum', album),

    trackList:
      relation('generateAlbumSidebarTrackList', album, track),
  }),

  generate: (relations, {html}) =>
    relations.box.slots({
      attributes: {class: 'track-list-sidebar-box'},

      content: [
        html.tag('h1', {[html.onlyIfSiblings]: true},
          relations.albumLink.slots({
            showNameDetail: 'inside',
          })),

        relations.trackList,
      ],
    }),
};
