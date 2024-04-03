export default {
  contentDependencies: [
    'generateAlbumSidebarGroupBox',
    'generateAlbumSidebarTrackSection',
    'generatePageSidebar',
    'linkAlbum',
  ],

  extraDependencies: ['html'],

  relations(relation, album, track) {
    const relations = {};

    relations.sidebar =
      relation('generatePageSidebar');

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
    const multipleContents = [];
    const multipleAttributes = [];

    multipleAttributes.push({class: 'track-list-sidebar-box'});
    multipleContents.push(
      html.tags([
        html.tag('h1', relations.albumLink),
        relations.trackSections,
      ]));

    if (data.isAlbumPage) {
      multipleAttributes.push(...
        relations.groupBoxes
          .map(() => ({class: 'individual-group-sidebar-box'})));

      multipleContents.push(...
        relations.groupBoxes
          .map(content => content.slot('mode', 'album')));
    } else {
      multipleAttributes.push({class: 'conjoined-group-sidebar-box'});
      multipleContents.push(
        relations.groupBoxes
          .flatMap((content, i, {length}) => [
            content.slot('mode', 'track'),
            i < length - 1 &&
              html.tag('hr', {
                style: `border-color: var(--primary-color); border-style: none none dotted none`
              }),
          ])
          .filter(Boolean));
    }

    return relations.sidebar.slots({
      // stickyMode: 'column',
      multipleContents,
      multipleAttributes,
    });
  },
};
