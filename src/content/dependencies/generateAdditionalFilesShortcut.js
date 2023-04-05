import {empty} from '../../util/sugar.js';

export default {
  extraDependencies: [
    'html',
    'language',
  ],

  data(additionalFiles) {
    return {
      titles: additionalFiles.map(fileGroup => fileGroup.title),
    };
  },

  generate(data, {
    html,
    language,
  }) {
    if (empty(data.titles)) {
      return html.blank();
    }

    return language.$('releaseInfo.additionalFiles.shortcut', {
      anchorLink:
        html.tag('a',
          {href: '#additional-files'},
          language.$('releaseInfo.additionalFiles.shortcut.anchorLink')),

      titles:
        language.formatUnitList(data.titles),
    });
  },
}
