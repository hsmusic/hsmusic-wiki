export default {
  contentDependencies: [
    'generateColorStyleAttribute',
    'linkStationaryIndex',
  ],

  query: (flashSide) => ({
    jumpAct:
      flashSide.acts[0],
  }),

  relations: (relation, _query, flashSide) => ({
    link:
      relation(
        'linkStationaryIndex',
        'localized.flashIndex',
        'flashIndex.title'),

    colorStyle:
      relation('generateColorStyleAttribute', flashSide.color ?? null),
  }),

  data: (query, flashSide) => ({
    name:
      flashSide.name,

    jumpActDirectory:
      query.jumpAct.directory,
  }),

  generate: (data, relations) =>
    relations.link.slots({
      content: data.name,
      hash: data.jumpActDirectory,
      attributes: [relations.colorStyle],
    }),
};
