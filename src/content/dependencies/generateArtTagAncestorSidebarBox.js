export default {
  contentDependencies: [
    'generateArtTagAncestorDescendantMapList',
    'linkArtTagDynamically',
  ],

  extraDependencies: ['html'],

  relations: (relation, ancestorArtTag, descendantArtTag) => ({
    ancestorArtTagLink:
      relation('linkArtTagDynamically', ancestorArtTag),

    ancestorArtTagMapList:
      relation('generateArtTagAncestorDescendantMapList',
        ancestorArtTag,
        descendantArtTag),
  }),

  generate: (relations, {html}) => ({
    class: 'tag-ancestor-sidebar-box',

    content: html.tags([
      html.tag('h2',
        relations.ancestorArtTagLink),

      relations.ancestorArtTagMapList,
    ]),
  }),
};
