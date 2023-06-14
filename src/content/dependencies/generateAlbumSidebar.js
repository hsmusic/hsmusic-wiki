export default {
  contentDependencies: [
    'generateAlbumSidebarGroupBox',
    'generateAlbumSidebarTrackSection',
    'linkAlbum',
  ],

  extraDependencies: ['html'],

  relations(relation, album, track) {
    const relations = {};

    relations.albumLink =
      relation('linkAlbum', album);

    relations.groupBoxes =
      album.groups.map(group =>
        relation('generateAlbumSidebarGroupBox', album, group));

    relations.trackSections =
      album.trackSections.map(trackSection =>
        relation('generateAlbumSidebarTrackSection', album, track, trackSection));

    return relations;
  },

  data(album, track) {
    return {isAlbumPage: !track};
  },

  generate(data, relations, {html}) {
    const trackListBox = {
      content:
        html.tags([
          html.tag('h1', relations.albumLink),
          relations.trackSections,
        ]),
    };

    if (data.isAlbumPage) {
      const groupBoxes =
        relations.groupBoxes
          .map(content => content.slot('mode', 'album'))
          .map(content => ({content}));

      return {
        leftSidebarMultiple: [
          ...groupBoxes,
          trackListBox,
        ],
      };
    }

    const conjoinedGroupBox = {
      content:
        relations.groupBoxes
          .flatMap((content, i, {length}) => [
            content.slot('mode', 'track'),
            i < length - 1 &&
              html.tag('hr', {
                style: `border-color: var(--primary-color); border-style: none none dotted none`
              }),
          ])
          .filter(Boolean),
    };

    return {
      // leftSidebarStickyMode: 'column',
      leftSidebarMultiple: [
        trackListBox,
        conjoinedGroupBox,
      ],
    };
  },
};
