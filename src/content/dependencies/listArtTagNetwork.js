import {sortAlphabetically} from '#sort';
import {empty, stitchArrays, unique} from '#sugar';

export default {
  contentDependencies: ['generateListingPage', 'linkArtTagInfo'],
  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({artTagData}) {
    return {artTagData};
  },

  query(sprawl, spec) {
    const artTags =
      sprawl.artTagData.filter(artTag => !artTag.isContentWarning);

    const rootArtTags =
      artTags
        .filter(artTag => !empty(artTag.directDescendantArtTags))
        .filter(artTag =>
          empty(artTag.directAncestorArtTags) ||
          artTag.directAncestorArtTags.length >= 2);

    sortAlphabetically(rootArtTags);

    rootArtTags.sort(
      ({directAncestorArtTags: ancestorsA},
       {directAncestorArtTags: ancestorsB}) =>
        ancestorsA.length - ancestorsB.length);

    const getStats = (artTag) => ({
      directUses:
        artTag.directlyTaggedInThings.length,

      totalUses:
        unique([
          ...artTag.indirectlyTaggedInThings,
          ...artTag.directlyTaggedInThings,
        ]).length,

      descendants:
        artTag.allDescendantArtTags.length,
    });

    const recursive = (artTag, depth) => {
      const descendantNodes =
        (empty(artTag.directDescendantArtTags)
          ? null
       : depth > 0 && artTag.directAncestorArtTags.length >= 2
          ? null
          : artTag.directDescendantArtTags
              .map(artTag => recursive(artTag, depth + 1)));

      descendantNodes?.sort(
        ({descendantNodes: descendantNodesA},
         {descendantNodes: descendantNodesB}) =>
            (descendantNodesA ? 1 : 0)
          - (descendantNodesB ? 1 : 0));

      const recursiveGetRootAncestor = ancestorArtTag =>
        (ancestorArtTag.directAncestorArtTags.length === 1
          ? recursiveGetRootAncestor(ancestorArtTag.directAncestorArtTags[0])
          : ancestorArtTag);

      const ancestorRootArtTags =
        (depth === 0 && !empty(artTag.directAncestorArtTags)
          ? unique(artTag.directAncestorArtTags.map(recursiveGetRootAncestor))
          : null);

      const stats = getStats(artTag);

      return {
        artTag,
        stats,
        descendantNodes,
        ancestorRootArtTags,
      };
    };

    const uppermostRootTags =
      artTags
        .filter(artTag => !empty(artTag.directDescendantArtTags))
        .filter(artTag => empty(artTag.directAncestorArtTags));

    const orphanArtTags =
      artTags
        .filter(artTag => empty(artTag.directDescendantArtTags))
        .filter(artTag => empty(artTag.directAncestorArtTags));

    return {
      spec,

      rootNodes:
        rootArtTags
          .map(artTag => recursive(artTag, 0)),

      uppermostRootTags,
      orphanArtTags,
    };
  },

  relations(relation, query) {
    const recursive = queryNode => ({
      artTagLink:
        relation('linkArtTagInfo', queryNode.artTag),

      ancestorTagLinks:
        queryNode.ancestorRootArtTags
          ?.map(artTag => relation('linkArtTagInfo', artTag))
          ?? null,

      descendantNodes:
        queryNode.descendantNodes
          ?.map(recursive)
          ?? null,
    });

    return {
      page:
        relation('generateListingPage', query.spec),

      rootNodes:
        query.rootNodes.map(recursive),

      uppermostRootTagLinks:
        query.uppermostRootTags
          .map(artTag => relation('linkArtTagInfo', artTag)),

      orphanArtTagLinks:
        query.orphanArtTags
          .map(artTag => relation('linkArtTagInfo', artTag)),
    };
  },

  data(query) {
    const rootArtTags = query.rootNodes.map(({artTag}) => artTag);

    const recursive = queryNode => ({
      directory:
        queryNode.artTag.directory,

      directUses:
        queryNode.stats.directUses,

      totalUses:
        queryNode.stats.totalUses,

      descendants:
        queryNode.stats.descendants,

      representsRoot:
        rootArtTags.includes(queryNode.artTag),

      ancestorTagDirectories:
        queryNode.ancestorRootArtTags
          ?.map(artTag => artTag.directory)
          ?? null,

      descendantNodes:
        queryNode.descendantNodes
          ?.map(recursive)
          ?? null,
    });

    return {
      rootNodes:
        query.rootNodes.map(recursive),

      uppermostRootTagDirectories:
        query.uppermostRootTags
          .map(artTag => artTag.directory),
    };
  },

  generate(data, relations, {html, language}) {
    const prefix = `listingPage.listArtTags.network`;

    const wrapTag = (dataNode, relationsNode) => [
      html.tag('span', {class: 'network-tag'},
        language.$(prefix, 'tag', {
          tag:
            relationsNode.artTagLink,
        })),

      html.tag('span', {class: 'network-tag'},
        {class: 'with-stat'},
        {style: 'display: none'},

        language.$(prefix, 'tag.withStat', {
          tag:
            (dataNode.representsRoot
              ? relationsNode.artTagLink.slots({
                  anchor: true,
                  hash: dataNode.directory,
                })
              : relationsNode.artTagLink),

          stat:
            html.tag('span', {class: 'network-tag-stat'},
              language.$(prefix, 'tag.withStat.stat', {
                stat: [
                  html.tag('span', {class: 'network-tag-direct-uses-stat'},
                    dataNode.directUses.toString()),

                  html.tag('span', {class: 'network-tag-total-uses-stat'},
                    dataNode.totalUses.toString()),

                  html.tag('span', {class: 'network-tag-descendants-stat'},
                    dataNode.descendants.toString()),
                ],
              })),
        }))
    ];

    const recursive = (dataNode, relationsNode, depth) => [
      html.tag('dt',
        {
          id: depth === 0 && dataNode.directory,
          class: depth % 2 === 0 ? 'even' : 'odd',
        },

        (depth === 0
          ? (relationsNode.ancestorTagLinks
              ? language.$(prefix, 'root.withAncestors', {
                  tag:
                    wrapTag(dataNode, relationsNode),

                  ancestors:
                    language.formatUnitList(
                      stitchArrays({
                        link: relationsNode.ancestorTagLinks,
                        directory: dataNode.ancestorTagDirectories,
                      }).map(({link, directory}) =>
                          link.slots({
                            anchor: true,
                            hash: directory,
                          }))),
                })
              : language.$(prefix, 'root.jumpToTop', {
                  tag:
                    wrapTag(dataNode, relationsNode),

                  link:
                    html.tag('a', {href: '#top'},
                      language.$(prefix, 'root.jumpToTop.link')),
                }))
          : (dataNode.representsRoot
              ? language.$(prefix, 'descendant.jumpToRoot', {
                  tag:
                    wrapTag(dataNode, relationsNode),
                })
              : language.$(prefix, 'descendant', {
                  tag:
                    wrapTag(dataNode, relationsNode),
                })))),

      dataNode.descendantNodes &&
      relationsNode.descendantNodes &&
        html.tag('dd',
          {class: depth % 2 === 0 ? 'even' : 'odd'},
          html.tag('dl',
            stitchArrays({
              dataNode: dataNode.descendantNodes,
              relationsNode: relationsNode.descendantNodes,
            }).map(({dataNode, relationsNode}) =>
                recursive(dataNode, relationsNode, depth + 1)))),
    ];

    return relations.page.slots({
      type: 'custom',

      content: [
        html.tag('p', {id: 'network-stat-line'},
          language.$(prefix, 'statLine', {
            stat: [
              html.tag('a', {id: 'network-stat-none'},
                {href: '#'},
                language.$(prefix, 'statLine.none')),

              html.tag('a', {id: 'network-stat-total-uses'},
                {href: '#'},
                {style: 'display: none'},
                language.$(prefix, 'statLine.totalUses')),

              html.tag('a', {id: 'network-stat-direct-uses'},
                {href: '#'},
                {style: 'display: none'},
                language.$(prefix, 'statLine.directUses')),

              html.tag('a', {id: 'network-stat-descendants'},
                {href: '#'},
                {style: 'display: none'},
                language.$(prefix, 'statLine.descendants')),
            ],
          })),

        html.tag('dl', {id: 'network-top-dl'}, [
          html.tag('dt', {id: 'top'},
            language.$(prefix, 'jumpToRoot.title')),

          html.tag('dd',
            html.tag('ul',
              stitchArrays({
                link: relations.uppermostRootTagLinks,
                directory: data.uppermostRootTagDirectories,
              }).map(({link, directory}) =>
                  html.tag('li',
                    language.$(prefix, 'jumpToRoot.item', {
                      tag:
                        link.slots({
                          anchor: true,
                          hash: directory,
                        }),
                    }))))),

          stitchArrays({
            dataNode: data.rootNodes,
            relationsNode: relations.rootNodes,
          }).map(({dataNode, relationsNode}) =>
              recursive(dataNode, relationsNode, 0)),

          !empty(relations.orphanArtTagLinks) && [
            html.tag('dt',
              language.$(prefix, 'orphanArtTags.title')),

            html.tag('dd',
              html.tag('ul',
                relations.orphanArtTagLinks.map(orphanArtTagLink =>
                  html.tag('li',
                    language.$(prefix, 'orphanArtTags.item', {
                      tag: orphanArtTagLink,
                    }))))),
          ],
        ]),
      ],
    });
  },
};
