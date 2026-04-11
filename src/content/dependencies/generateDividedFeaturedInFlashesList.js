import {empty, filterMultipleArrays, stitchArrays} from '#sugar';

export default {
  sprawl: ({flashSideData, wikiInfo}) => ({
    enableFlashesAndGames:
      wikiInfo.enableFlashesAndGames,

    divideFlashListsBySides:
      wikiInfo.divideFlashListsBySides,

    allSides:
      flashSideData,
  }),

  query(sprawl, features, _contextTrack) {
    if (!sprawl.enableFlashesAndGames) {
      return {
        dividingSides: [], dividingLabels: [],
        dividedFeatures: [],
        undividedFeatures: [],
      };
    }

    if (empty(sprawl.divideFlashListsBySides)) {
      return {
        dividingSides: [], dividingLabels: [],
        dividedFeatures: [],
        undividedFeatures: features,
      };
    }

    const {allSides} = sprawl;

    const divisions = new Map();
    const dividingSideIndices = [];
    const undividedFeatures = [];
    for (const {side, label} of sprawl.divideFlashListsBySides) {
      divisions.set(side, {label, features: []});
      dividingSideIndices.push(allSides.indexOf(side));
    }

    for (const feature of features) {
      const sideIndex =
        allSides.indexOf(feature.flash.side);

      const closestDividingSideIndex =
        dividingSideIndices.findLast(i => i <= sideIndex);

      if (typeof closestDividingSideIndex === 'number') {
        const closestDividingSide =
          allSides.at(closestDividingSideIndex);

        divisions.get(closestDividingSide).features.push(feature);
      } else {
        undividedFeatures.push(feature);
      }
    }

    const dividingSides = Array.from(divisions.keys());
    const dividingLabels = Array.from(divisions.values()).map(({label}) => label);
    const dividedFeatures = Array.from(divisions.values()).map(({features}) => features);

    filterMultipleArrays(
      dividingSides,
      dividingLabels,
      dividedFeatures,
      (_side, _label, dividedFeatures) => !empty(dividedFeatures));

    return {
      dividingSides, dividingLabels,
      dividedFeatures,
      undividedFeatures,
    };
  },

  relations: (relation, query, _sprawl, features, contextTrack) => ({
    flatList:
      (empty(query.dividedFeatures)
        ? relation('generateTrackFeaturedInFlashesList', features, contextTrack)
        : null),

    contentHeading:
      relation('generateContentHeading'),

    dividingSideLinks:
      query.dividingSides
        .map(side => relation('linkFlashSide', side)),

    dividedFlashLists:
      query.dividedFeatures
        .map(features => relation('generateTrackFeaturedInFlashesList', features, contextTrack)),

    undividedFlashList:
      (empty(query.undividedFeatures)
        ? null
        : relation('generateTrackFeaturedInFlashesList', query.undividedFeatures, contextTrack)),
  }),

  data: (query, _sprawl, _tracks) => ({
    dividingLabels:
      query.dividingLabels,
  }),

  generate(data, relations, {html, language}) {
    if (relations.flatList) {
      return relations.flatList;
    }

    stitchArrays({
      sideLink: relations.dividingSideLinks,
      label: data.dividingLabels,
    }).forEach(({sideLink, label}) => {
        sideLink.setSlot('color', false);

        if (label) {
          sideLink.setSlot('content', language.sanitize(label));
        }
      });

    return (
      html.tag('dl', {class: 'division-list'},
        {[html.onlyIfContent]: true},

        language.encapsulate('flashList', listCapsule => [
          stitchArrays({
            sideLink: relations.dividingSideLinks,
            flashList: relations.dividedFlashLists,
          }).map(({sideLink, flashList}) => [
              html.tag('dt',
                language.$(listCapsule, 'underSide', {side: sideLink})),

              html.tag('dd', flashList),
            ]),

          html.tags([
            html.tag('dt',
              {[html.onlyIfSiblings]: true},
              language.$(listCapsule, 'underOther')),

            html.tag('dd',
              {[html.onlyIfContent]: true},
              relations.undividedFlashList),
          ]),
        ])));
  },
};
