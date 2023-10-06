import {collectTreeLeaves} from '#wiki-data';

export default {
  contentDependencies: ['generateArtTagAncestorSidebarBox'],
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
    ancestorBoxes:
      query.furthestAncestorArtTags
        .map(ancestorArtTag =>
          relation('generateArtTagAncestorSidebarBox', ancestorArtTag, artTag)),
  }),

  generate: (relations) =>
    ({leftSidebarMultiple: relations.ancestorBoxes}),
};
