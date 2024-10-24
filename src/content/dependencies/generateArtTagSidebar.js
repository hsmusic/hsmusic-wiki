import {collectTreeLeaves, stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generatePageSidebar',
    'generatePageSidebarBox',
    'generateArtTagAncestorDescendantMapList',
    'linkArtTagDynamically',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

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

    sidebarBox:
      relation('generatePageSidebarBox'),

    artTagLink:
      relation('linkArtTagDynamically', artTag),

    furthestAncestorArtTagMapLists:
      query.furthestAncestorArtTags
        .map(ancestorArtTag =>
          relation('generateArtTagAncestorDescendantMapList',
            ancestorArtTag,
            artTag)),
  }),

  data: query => ({
    furthestAncestorArtTagNames:
      query.furthestAncestorArtTags
        .map(ancestorArtTag => ancestorArtTag.name),
  }),

  generate: (data, relations, {html, language}) =>
    relations.sidebar.slots({
      boxes: [
        relations.sidebarBox.slots({
          content: [
            html.tag('h1',
              relations.artTagLink),

            stitchArrays({
              name: data.furthestAncestorArtTagNames,
              list: relations.furthestAncestorArtTagMapLists,
            }).map(({name, list}) =>
                html.tag('details',
                  {
                    class: 'has-tree-list',
                    open: relations.furthestAncestorArtTagMapLists.length === 1,
                  },
                  [
                    html.tag('summary',
                      html.tag('span', {class: 'group-name'},
                        language.sanitize(name))),

                    list,
                  ])),
          ],
        }),
      ],
    }),
};
