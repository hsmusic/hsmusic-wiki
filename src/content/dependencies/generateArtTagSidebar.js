import {empty, stitchArrays} from '#sugar';
import {collectTreeLeaves} from '#wiki-data';

export default {
  contentDependencies: [
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

    furthestAncestorArtTagNames:
      query.furthestAncestorArtTags
        .map(ancestorArtTag => ancestorArtTag.name),
  }),

  generate(data, relations, {html, language}) {
    if (
      empty(relations.directDescendantArtTagLinks) &&
      empty(relations.furthestAncestorArtTagMapLists)
    ) {
      return {};
    }

    return {
      leftSidebarContent: [
        html.tag('h1',
          relations.artTagLink),

        !empty(relations.directDescendantArtTagLinks) &&
          html.tag('details', {class: 'current', open: true}, [
            html.tag('summary',
              html.tag('span', {class: 'group-name'},
                language.sanitize(data.name))),

            html.tag('ul',
              relations.directDescendantArtTagLinks
                .map(link => html.tag('li', link))),
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
                  html.tag('span', {class: 'group-name'},
                    language.sanitize(name))),

                list,
              ])),
      ],
    };
  },
};
