import {sortByName} from '#sort';
import {stitchArrays} from '#sugar';

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
    const switchableLanguages =
      Object.entries(languages)
        .filter(([code, language]) => code !== 'default' && !language.hidden)
        .map(([code, language]) => language);

    if (switchableLanguages.length <= 1) {
      return html.blank();
    }

    sortByName(switchableLanguages);

    const [pagePathSubkey, ...pagePathArgs] = pagePath;

    const linkPaths =
      switchableLanguages.map(language =>
        (language === defaultLanguage
          ? (['localizedDefaultLanguage.' + pagePathSubkey,
              ...pagePathArgs])
          : (['localizedWithBaseDirectory.' + pagePathSubkey,
              language.code,
              ...pagePathArgs])));

    const links =
      stitchArrays({
        language: switchableLanguages,
        linkPath: linkPaths,
      }).map(({language, linkPath}) =>
          html.tag('span',
            html.tag('a',
              {href: to(...linkPath)},
              language.name)));

    return html.tag('div', {class: 'footer-localization-links'},
      language.$('misc.uiLanguage', {
        languages: language.formatListWithoutSeparator(links),
      }));
  },
};
