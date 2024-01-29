export const NEWS_DATA_FILE = 'news.yaml';

import Thing from '#thing';
import {sortChronologically} from '#wiki-data';
import {parseDate} from '#yaml';

import {contentString, directory, name, simpleDate}
  from '#composite/wiki-properties';

export class NewsEntry extends Thing {
  static [Thing.referenceType] = 'news-entry';
  static [Thing.friendlyName] = `News Entry`;

  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    name: name('Unnamed News Entry'),
    directory: directory(),
    date: simpleDate(),

    content: contentString(),

    // Expose only

    contentShort: {
      flags: {expose: true},

      expose: {
        dependencies: ['content'],

        compute: ({content}) => content.split('<hr class="split">')[0],
      },
    },
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Name': {property: 'name'},
      'Directory': {property: 'directory'},

      'Date': {
        property: 'date',
        transform: parseDate,
      },

      'Content': {property: 'content'},
    },
  };

  static [Thing.getYamlLoadingSpec] = ({
    documentModes: {allInOne},
    thingConstructors: {NewsEntry},
  }) => ({
    title: `Process news data file`,
    file: NEWS_DATA_FILE,

    documentMode: allInOne,
    documentThing: NewsEntry,

    save: (results) => ({newsData: results}),

    sort({newsData}) {
      sortChronologically(newsData, {latestFirst: true});
    },
  });
}
