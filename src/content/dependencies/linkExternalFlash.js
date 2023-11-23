// Note: This function is seriously hard-coded for HSMusic, with custom
// presentation of links to Homestuck flashes hosted various places.

// This also appears to be dead code, apart from a single snapshot test??

export default {
  contentDependencies: ['linkExternal'],
  extraDependencies: ['html', 'language'],

  relations(relation, url) {
    return {
      link: relation('linkExternal', url),
    };
  },

  data(url, flash) {
    return {
      url,
      page: flash.page,
    };
  },

  generate(data, relations, {html, language}) {
    const {link} = relations;
    const {url, page} = data;

    link.setSlot('context', 'flash');

    return html.tag('span',
      {class: 'nowrap'},

      url.includes('homestuck.com')
        ? isNaN(Number(page))
          ? language.$('misc.external.flash.homestuck.secret', {link})
          : language.$('misc.external.flash.homestuck.page', {link, page})

    : url.includes('bgreco.net')
        ? language.$('misc.external.flash.bgreco', {link})

    : url.includes('youtu')
        ? language.$('misc.external.flash.youtube', {link})

        : link);
  },
};
