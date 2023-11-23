export default {
  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({wikiInfo}) => ({wikiInfo}),

  data(sprawl, url) {
    const data = {url};

    const {canonicalBase} = sprawl.wikiInfo;
    if (canonicalBase) {
      const {hostname: canonicalDomain} = new URL(canonicalBase);
      Object.assign(data, {canonicalDomain});
    }

    return data;
  },

  slots: {
    mode: {
      validate: v => v.is('generic', 'album', 'flash'),
      default: 'generic',
    },
  },

  generate(data, slots, {html, language}) {
    return (
      html.tag('a',
        {href: data.url, class: 'nowrap'},
        language.formatExternalLink(data.url, {style: 'platform'})));
  },

    /*
    : domain.includes('youtu')
        ? slots.mode === 'album'
          ? data.url.includes('list=')
            ? language.$('misc.external.youtube.playlist')
            : language.$('misc.external.youtube.fullAlbum')
          : language.$('misc.external.youtube')

    switch (slots.mode) {
      case 'flash': {
        const wrap = content =>
          html.tag('span', {class: 'nowrap'}, content);

        if (domain.includes('homestuck.com')) {
          const match = pathname.match(/\/story\/(.*)\/?/);
          if (match) {
            if (isNaN(Number(match[1]))) {
              return wrap(language.$('misc.external.flash.homestuck.secret', {link}));
            } else {
              return wrap(language.$('misc.external.flash.homestuck.page', {
                link,
                page: match[1],
              }));
            }
          }
        } else if (domain.includes('bgreco.net')) {
          return wrap(language.$('misc.external.flash.bgreco', {link}));
        } else if (domain.includes('youtu')) {
          return wrap(language.$('misc.external.flash.youtube', {link}));
        }

        return link;
      }

      default:
        return link;
    }
    */
};
