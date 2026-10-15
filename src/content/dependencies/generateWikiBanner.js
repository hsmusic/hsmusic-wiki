export default {
  sprawl: ({wikiInfo}) => ({wikiInfo}),

  relations: (relation, sprawl) => ({
    banner:
      relation('generateBanner'),

    colorAttribute:
      relation('generateColorStyleAttribute', sprawl.wikiInfo.color),
  }),

  data: (sprawl) => ({
    path:
      (sprawl.wikiInfo.hasWikiBanner
        ? ['media.path', 'banner.' + sprawl.wikiInfo.wikiBannerFileExtension]
        : null),

    dimensions:
      sprawl.wikiInfo.wikiBannerDimensions,

    color:
      sprawl.wikiInfo.color,
  }),

  generate: (data, relations, {language}) =>
    relations.banner.slots({
      path: data.path,
      dimensions: data.dimensions,
      alt: language.$('misc.alt.wikiBanner'),
    }),
};
