export default {
  contentDependencies: [
    'generateAlbumSidebarGroupBox',
    'generateAlbumSidebarTrackSection',
    'linkAlbum',
  ],

  extraDependencies: ['html'],

  contracts: {
    relations: {
      hook(contract, [relation, album, track]) {
        contract.provide({
          relation, album, track,

          groups: contract.selectProperty(album, 'groups'),
          trackSections: contract.selectProperty(album, 'trackSections'),
        });
      },

      compute({relation, album, track, groups, trackSections}) {
        const relations = {};

        relations.albumLink =
          relation('linkAlbum', album);

        relations.groupBoxes =
          groups.map(group =>
            relation('generateAlbumSidebarGroupBox', album, group));

        relations.trackSections =
          trackSections.map(trackSection =>
            relation('generateAlbumSidebarTrackSection', album, track, trackSection));

        return relations;
      },
    },

    data: {
      hook(contract, [album, track]) {
        contract.provide({track});
      },

      compute({track}) {
        return {isAlbumPage: !track};
      },
    },
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
          .map(content => content.slot('isAlbumPage', true))
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
            content,
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
