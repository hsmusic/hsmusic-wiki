export default {
  extraDependencies: [
    'defaultLanguage',
    'html',
    'language',
    'languages',
    'pagePath',
    'to',
  ],

  generate({
    defaultLanguage,
    html,
    language,
    languages,
    pagePath,
    to,
  }) {
    const links = Object.entries(languages)
      .filter(([code, language]) => code !== 'default' && !language.hidden)
      .map(([code, language]) => language)
      .sort(({name: a}, {name: b}) => (a < b ? -1 : a > b ? 1 : 0))
      .map((language) =>
        html.tag('span',
          html.tag('a',
            {
              href:
                language === defaultLanguage
                  ? to(
                      'localizedDefaultLanguage.' + pagePath[0],
                      ...pagePath.slice(1))
                  : to(
                      'localizedWithBaseDirectory.' + pagePath[0],
                      language.code,
                      ...pagePath.slice(1)),
            },
            language.name)));

    return html.tag('div', {class: 'footer-localization-links'},
      language.$('misc.uiLanguage', {
        languages: links.join('\n'),
      }));
  },
};
