import {empty, stitchArrays, unique} from '#sugar';
import {sortAlphabetically} from '#wiki-data';

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

    const recursive = (artTag, asRoot) => {
      const descendantNodes =
        (empty(artTag.directDescendantArtTags)
          ? null
       : !asRoot && artTag.directAncestorArtTags.length >= 2
          ? null
          : artTag.directDescendantArtTags
              .map(artTag => recursive(artTag, false)));

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
        (asRoot && !empty(artTag.directAncestorArtTags)
          ? unique(artTag.directAncestorArtTags.map(recursiveGetRootAncestor))
          : null);

      return {
        artTag,
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
          .map(artTag => recursive(artTag, true)),

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

    const recursive = (dataNode, relationsNode, asRoot) => [
      html.tag('dt',
        (asRoot
          ? {id: dataNode.directory}
          : {}),

        (asRoot
          ? (relationsNode.ancestorTagLinks
              ? language.$(prefix, 'root.withAncestors', {
                  tag: relationsNode.artTagLink,
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
                  tag: relationsNode.artTagLink,
                  link:
                    html.tag('a', {href: '#top'},
                      language.$(prefix, 'root.jumpToTop.link')),
                }))
          : (dataNode.representsRoot
              ? language.$(prefix, 'descendant.jumpToRoot', {
                  tag:
                    relationsNode.artTagLink.slots({
                      anchor: true,
                      hash: dataNode.directory,
                    }),
                })
              : language.$(prefix, 'descendant', {
                  tag: relationsNode.artTagLink,
                })))),

      dataNode.descendantNodes &&
      relationsNode.descendantNodes &&
        html.tag('dd',
          html.tag('dl',
            stitchArrays({
              dataNode: dataNode.descendantNodes,
              relationsNode: relationsNode.descendantNodes,
            }).map(({dataNode, relationsNode}) =>
                recursive(dataNode, relationsNode, false)))),
    ];

    return relations.page.slots({
      type: 'custom',

      content: [
        html.tag('dl', [
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
              recursive(dataNode, relationsNode, true)),

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
