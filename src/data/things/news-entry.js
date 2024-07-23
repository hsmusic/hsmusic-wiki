export const NEWS_DATA_FILE = 'news.yaml';

import {sortChronologically} from '#sort';
import Thing from '#thing';
import {parseDate} from '#yaml';

import {exitWithoutDependency, exposeDependency}
  from '#composite/control-flow';
import {withParsedContentStringNodes} from '#composite/wiki-data';
import {contentString, contentUntilSplit, directory, name, simpleDate}
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

    contentShort: contentUntilSplit(),
  });

  static [Thing.findSpecs] = {
    newsEntry: {
      referenceTypes: ['news-entry'],
      bindTo: 'newsData',
    },
  };

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
