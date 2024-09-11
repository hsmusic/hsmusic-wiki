export default {
  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({wikiInfo}) {
    return {
      canonicalBase: wikiInfo.canonicalBase,
      shortWikiName: wikiInfo.nameShort,
    };
  },

  data(sprawl) {
    return {
      canonicalBase: sprawl.canonicalBase,
      shortWikiName: sprawl.shortWikiName,
    };
  },

  slots: {
    mode: {validate: v => v.is('html', 'json')},

    title: {type: 'string'},
    description: {type: 'string'},

    headingContent: {type: 'string'},
    headingLink: {type: 'string'},
    imagePath: {type: 'string'},
  },

  generate(data, slots, {html, language}) {
    switch (slots.mode) {
      case 'html':
        return html.tags([
          slots.title &&
            html.tag('meta', {property: 'og:title', content: slots.title}),

          slots.description &&
            html.tag('meta', {
              property: 'og:description',
              content: slots.description,
            }),

          slots.imagePath &&
            html.tag('meta', {property: 'og:image', content: slots.imagePath}),
        ]);

      case 'json':
        return JSON.stringify({
          author_name:
            (slots.headingContent
              ? html.resolve(
                  language.$('misc.socialEmbed.heading', {
                    wikiName: data.shortWikiName,
                    heading: slots.headingContent,
                  }),
                  {normalize: 'string'})
              : undefined),

          author_url:
            (slots.headingLink && data.canonicalBase
              ? data.canonicalBase.replace(/\/$/, '') +
                '/' +
                slots.headingLink.replace(/^\//, '')
              : undefined),
        });
    }
  },
};
