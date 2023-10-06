import {collectTreeLeaves} from '#sugar';

export default {
  contentDependencies: [
    'generateArtTagAncestorSidebarBox',
    'generatePageSidebar',
  ],

  extraDependencies: ['wikiData'],

  sprawl: ({artTagData}) =>
    ({artTagData}),

  query(sprawl, artTag) {
    const baobab = artTag.ancestorArtTagBaobabTree;
    const uniqueLeaves = new Set(collectTreeLeaves(baobab));

    // Just match the order in tag data.
    const furthestAncestorArtTags =
      sprawl.artTagData
        .filter(artTag => uniqueLeaves.has(artTag));

    return {furthestAncestorArtTags};
  },

  relations: (relation, query, sprawl, artTag) => ({
    sidebar:
      relation('generatePageSidebar'),

    ancestorBoxes:
      query.furthestAncestorArtTags
        .map(ancestorArtTag =>
          relation('generateArtTagAncestorSidebarBox', ancestorArtTag, artTag)),
  }),

  generate: (relations) =>
    relations.sidebar.slots({
      boxes: relations.ancestorBoxes,
    }),
};
