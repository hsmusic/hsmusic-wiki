export default {
  sprawl: ({wikiInfo}) => ({wikiInfo}),

  relations: (relation, sprawl, thing) => ({
    additionalNames:
      (sprawl.wikiInfo.preferAdditionalNamesBox
        ? relation('generateAdditionalNamesBox', thing)
        : relation('generateAdditionalNamesPanel', thing)),
  }),

  generate: (relations) => relations.additionalNames,
};
