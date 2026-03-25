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
      return {dividingSides: [], dividedFeatures: []};
    }

    const {allSides} = sprawl;

    const divisions = new Map();
    const dividingSideIndices = [];
    for (const {side, label} of sprawl.divideFlashListsBySides) {
      divisions.set(side, {label, features: []});
      dividingSideIndices.push(allSides.indexOf(side));
    }

    for (const feature of features) {
      const sideIndex =
        allSides.indexOf(feature.flash.side);

      const closestDividingSideIndex =
        dividingSideIndices.findLast(i => i <= sideIndex);

      const closestDividingSide =
        allSides.at(closestDividingSideIndex);

      if (closestDividingSide) {
        divisions.get(closestDividingSide).features.push(feature);
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

    return {dividingSides, dividingLabels, dividedFeatures};
  },

  relations: (relation, query, sprawl, features, contextTrack) => ({
    flatList:
      (empty(sprawl.divideFlashListsBySides)
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
  }),

  data: (query, _sprawl, _tracks) => ({
    dividingSideNames:
      query.dividingSides
        .map(side => side.name),

    dividingLabels:
      query.dividingLabels,
  }),

  slots: {
    headingString: {
      type: 'string',
    },
  },

  generate(data, relations, slots, {html, language}) {
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

        language.encapsulate('flashList', listCapsule =>
          stitchArrays({
            sideLink: relations.dividingSideLinks,
            flashList: relations.dividedFlashLists,
            sideName: data.dividingSideNames,
            label: data.dividingLabels,
          }).map(({sideLink, flashList, sideName, label}) => [
              language.encapsulate(listCapsule, 'underSide', capsule =>
                (slots.headingString
                  ? relations.contentHeading.clone().slots({
                      tag: 'dt',

                      title:
                        language.$(capsule, {side: sideLink}),

                      stickyTitle:
                        language.$(slots.headingString, 'sticky', 'fromGroup', {
                          side:
                            (label
                              ? language.sanitize(label)
                              : language.sanitize(sideName)),
                        }),
                    })

                  : html.tag('dt',
                      language.$(capsule, {
                        side: sideLink,
                      })))),

              html.tag('dd', flashList),
            ]))));
  },
};
