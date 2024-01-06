import {
  contentString,
  directory,
  name,
  simpleDate,
} from '#composite/wiki-properties';

import Thing from './thing.js';

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
}
