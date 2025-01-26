import {getOrigin} from '#urls';

export default {
  extraDependencies: ['html', 'language', 'urls', 'wikiData'],

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
    imagePath: {validate: v => v.strictArrayOf(v.isString)},
  },

  generate(data, slots, {html, language, urls}) {
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
            html.tag('meta', {
              property: 'og:image',
              content:
                (() => {
                  const toResult =
                    urls
                      .from('shared.root')
                      .to(...slots.imagePath);

                  if (getOrigin(toResult)) {
                    return toResult;
                  } else {
                    return '/' + toResult;
                  }
                })(),
            }),
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
