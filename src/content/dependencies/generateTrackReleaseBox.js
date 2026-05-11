export default {
  relations: (relation, track) => ({
    box:
      relation('generatePageSidebarBox'),

    colorStyle:
      relation('generateColorStyleAttribute', track.album.color),

    trackLink:
      relation('linkTrack', track),
  }),

  data: (track) => ({
    albumName:
      track.album.name,
  }),

  slots: {
    meta: {type: 'boolean', default: false},
  },

  generate: (data, relations, slots, {html, language}) =>
    language.encapsulate('albumSidebar.releaseBox', boxCapsule =>
      relations.box.slots({
        attributes: [
          {class: 'track-release-sidebar-box'},
          relations.colorStyle,

          slots.meta &&
            {class: 'meta-album'},
        ],

        content: [
          html.tag('h1',
            language.$(boxCapsule, 'title', {
              album:
                relations.trackLink.slots({
                  color: false,
                  content:
                    language.sanitize(data.albumName),
                }),
            })),
        ],
      })),
};
