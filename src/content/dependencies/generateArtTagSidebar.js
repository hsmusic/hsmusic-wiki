import {collectTreeLeaves, empty, stitchArrays, unique} from '#sugar';

export default {
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

    directDescendantArtTagLinks:
      artTag.directDescendantArtTags
        .map(descendantArtTag =>
          relation('linkArtTagDynamically', descendantArtTag)),

    furthestAncestorArtTagMapLists:
      query.furthestAncestorArtTags
        .map(ancestorArtTag =>
          relation('generateArtTagAncestorDescendantMapList',
            ancestorArtTag,
            artTag)),
  }),

  data: (query, sprawl, artTag) => ({
    name: artTag.name,

    directDescendantTimesFeaturedTotal:
      artTag.directDescendantArtTags.map(artTag =>
        unique([
          ...artTag.directlyFeaturedInArtworks,
          ...artTag.indirectlyFeaturedInArtworks,
        ]).length),

    furthestAncestorArtTagNames:
      query.furthestAncestorArtTags
        .map(ancestorArtTag => ancestorArtTag.name),
  }),

  generate(data, relations, {html, language}) {
    if (
      empty(relations.directDescendantArtTagLinks) &&
      empty(relations.furthestAncestorArtTagMapLists)
    ) {
      return relations.sidebar;
    }

    return relations.sidebar.slots({
      boxes: [
        relations.sidebarBox.slots({
          content: [
            html.tag('h1',
              relations.artTagLink),

            !empty(relations.directDescendantArtTagLinks) &&
              html.tag('details', {class: 'current', open: true}, [
                html.tag('summary',
                  html.tag('span',
                    html.tag('b',
                      language.sanitize(data.name)))),

                html.tag('ul',
                  stitchArrays({
                    link: relations.directDescendantArtTagLinks,
                    timesFeaturedTotal: data.directDescendantTimesFeaturedTotal,
                  }).map(({link, timesFeaturedTotal}) =>
                      html.tag('li', [
                        link,
                        html.tag('span', {class: 'times-used'},
                          language.countTimesFeatured(timesFeaturedTotal)),
                      ]))),
              ]),

            stitchArrays({
              name: data.furthestAncestorArtTagNames,
              list: relations.furthestAncestorArtTagMapLists,
            }).map(({name, list}) =>
                html.tag('details',
                  {
                    class: 'has-tree-list',
                    open:
                      empty(relations.directDescendantArtTagLinks) &&
                      relations.furthestAncestorArtTagMapLists.length === 1,
                  },
                  [
                    html.tag('summary',
                      html.tag('span',
                        html.tag('b',
                          language.sanitize(name)))),

                      list,
                    ])),
          ],
        }),
      ],
    });
  },
};
