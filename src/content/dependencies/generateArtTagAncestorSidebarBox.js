export default {
  contentDependencies: [
    'generateArtTagAncestorDescendantMapList',
    'generatePageSidebarBox',
    'linkArtTagDynamically',
  ],

  extraDependencies: ['html'],

  relations: (relation, ancestorArtTag, descendantArtTag) => ({
    sidebarBox:
      relation('generatePageSidebarBox'),

    ancestorArtTagLink:
      relation('linkArtTagDynamically', ancestorArtTag),

    ancestorArtTagMapList:
      relation('generateArtTagAncestorDescendantMapList',
        ancestorArtTag,
        descendantArtTag),
  }),

  generate: (relations, {html}) =>
    relations.sidebarBox.slots({
      attributes: {class: 'tag-ancestor-sidebar-box'},

      content: html.tags([
        html.tag('h2',
          relations.ancestorArtTagLink),

        relations.ancestorArtTagMapList,
      ]),
    }),
};
