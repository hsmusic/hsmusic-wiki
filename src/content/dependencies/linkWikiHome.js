export default {
  contentDependencies: ['linkTemplate'],
  extraDependencies: ['wikiData'],

  sprawl({wikiInfo}) {
    return {wikiShortName: wikiInfo.nameShort};
  },

  relations: (relation) =>
    ({link: relation('linkTemplate')}),

  data: (sprawl) =>
    ({wikiShortName: sprawl.wikiShortName}),

  generate: (data, relations) =>
    relations.link.slots({
      path: ['localized.home'],
      content: data.wikiShortName,
    }),
};
