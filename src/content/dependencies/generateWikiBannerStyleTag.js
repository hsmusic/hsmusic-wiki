// UUGGGGHHHHH very annoying that this isn't portable
// with generateWikiBanner itself but y'know

export default {
  sprawl: ({wikiInfo}) => ({wikiInfo}),

  relations: (relation, _sprawl) => ({
    styleTag:
      relation('generateStyleTag'),
  }),

  data: (sprawl) => ({
    hasBanner:
      sprawl.wikiInfo.hasWikiBanner,

    bannerStyle:
      (sprawl.wikiInfo.hasWikiBanner
        ? sprawl.wikiInfo.wikiBannerStyle
        : null),
  }),

  generate: (data, relations) =>
    relations.styleTag.slots({
      attributes: {class: 'wiki-banner-style'},

      rules: [
        data.hasBanner && {
          select: '#banner img',
          declare: [data.bannerStyle],
        },
      ],
    }),
};
