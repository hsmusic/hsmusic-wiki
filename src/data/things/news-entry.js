export const NEWS_DATA_FILE = 'news.yaml';

import {V} from '#composite';
import {sortChronologically} from '#sort';
import Thing from '#thing';
import {parseDate} from '#yaml';

import {exposeConstant} from '#composite/control-flow';
import {contentString, directory, name, simpleDate}
  from '#composite/wiki-properties';

export class NewsEntry extends Thing {
  static [Thing.referenceType] = 'news-entry';
  static [Thing.friendlyName] = `News Entry`;
  static [Thing.wikiData] = 'newsData';

  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    name: name(V('Unnamed News Entry')),
    directory: directory(),
    date: simpleDate(),

    content: contentString(),

    // Expose only

    isNewsEntry: exposeConstant(V(true)),

    contentShort: {
      flags: {expose: true},

      expose: {
        dependencies: ['content'],

        compute: ({content}) => content.split('<hr class="split">')[0],
      },
    },
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

    sort({newsData}) {
      sortChronologically(newsData, {latestFirst: true});
    },
  });
}
