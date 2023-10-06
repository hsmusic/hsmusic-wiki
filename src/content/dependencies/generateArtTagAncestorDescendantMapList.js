import {stitchArrays} from '#sugar';
import {filterMultipleArrays, sortMultipleArrays} from '#wiki-data';

export default {
  contentDependencies: ['linkArtTagDynamically'],
  extraDependencies: ['html', 'language'],

  // Recursion ain't too pretty!

  query(ancestorArtTag, targetArtTag) {
    const recursive = artTag => {
      const artTags =
        artTag.directDescendantArtTags.slice();

      const displayBriefly =
        !artTags.includes(targetArtTag) &&
        artTags.length > 3;

      const artTagsIncludeTargetArtTag =
        artTags.map(artTag => artTag.allDescendantArtTags.includes(targetArtTag));

      const numExemptArtTags =
        (displayBriefly
          ? artTagsIncludeTargetArtTag
              .filter(includesTargetArtTag => !includesTargetArtTag)
              .length
          : null);

      const sublists =
        stitchArrays({
          artTag: artTags,
          includesTargetArtTag: artTagsIncludeTargetArtTag,
        }).map(({artTag, includesTargetArtTag}) =>
            (includesTargetArtTag
              ? recursive(artTag)
              : null));

      if (displayBriefly) {
        filterMultipleArrays(artTags, sublists,
          (artTag, sublist) =>
            artTag === targetArtTag ||
            sublist !== null);
      } else {
        sortMultipleArrays(artTags, sublists,
          (artTagA, artTagB, sublistA, sublistB) =>
            (sublistA && sublistB
              ? 0
           : !sublistA && !sublistB
              ? 0
           : sublistA
              ? 1
              : -1));
      }

      return {
        displayBriefly,
        numExemptArtTags,
        artTags,
        sublists,
      };
    };

    return {root: recursive(ancestorArtTag)};
  },

  relations(relation, query, _ancestorArtTag, _targetArtTag) {
    const recursive = ({artTags, sublists}) => ({
      artTagLinks:
        artTags
          .map(artTag => relation('linkArtTagDynamically', artTag)),

      sublists:
        sublists
          .map(sublist => (sublist ? recursive(sublist) : null)),
    });

    return {root: recursive(query.root)};
  },

  data(query, _ancestorArtTag, targetArtTag) {
    const recursive = ({displayBriefly, numExemptArtTags, artTags, sublists}) => ({
      displayBriefly,
      numExemptArtTags,

      artTagsAreTargetTag:
        artTags
          .map(artTag => artTag === targetArtTag),

      sublists:
        sublists
          .map(sublist => (sublist ? recursive(sublist) : null)),
    });

    return {root: recursive(query.root)};
  },

  generate(data, relations, {html, language}) {
    const recursive = (dataNode, relationsNode) =>
      html.tag('dl', [
        dataNode.displayBriefly &&
          html.tag('dt',
            language.$('artTagPage.sidebar.otherTagsExempt', {
              tags:
                language.countArtTags(dataNode.numExemptArtTags, {unit: true}),
            })),

        stitchArrays({
          isTargetTag: dataNode.artTagsAreTargetTag,
          dataSublist: dataNode.sublists,

          artTagLink: relationsNode.artTagLinks,
          relationsSublist: relationsNode.sublists,
        }).map(({
            isTargetTag, dataSublist,
            artTagLink, relationsSublist,
          }) => [
            html.tag('dt',
              {class: (dataSublist || isTargetTag) && 'current'},
              artTagLink),

            dataSublist &&
              html.tag('dd',
                recursive(dataSublist, relationsSublist)),
          ]),
      ]);

    return recursive(data.root, relations.root);
  },
};
