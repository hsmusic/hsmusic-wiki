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
    const {isAlbumPage} = data;

    const trackListPart = html.tags([
      html.tag('h1', relations.albumLink),
      relations.trackSections,
    ]);

    if (isAlbumPage) {
      return {
        // leftSidebarStickyMode: 'last',
        leftSidebarMultiple: [
          ...(
            relations.groupBoxes
              .map(groupBox => groupBox.slot('isAlbumPage', true))
              .map(content => ({content}))),
          {content: trackListPart},
        ],
      };
    } else {
      return {
        // leftSidebarStickyMode: 'column',
        leftSidebarMultiple: [
          {content: trackListPart},
          // ...relations.groupBoxes.map(content => ({content})),
          {
            content:
              relations.groupBoxes
                .flatMap((content, i, {length}) => [
                  content,
                  i < length - 1 &&
                    html.tag('hr', {
                      style: `border-color: var(--primary-color); border-style: none none dotted none`
                    }),
                ])
                .filter(Boolean),
          },
        ],
      };
    }
  },
};
