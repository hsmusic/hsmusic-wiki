import Thing from './thing.js';

export class NewsEntry extends Thing {
  static [Thing.referenceType] = 'news-entry';

  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    name: Thing.common.name('Unnamed News Entry'),
    directory: Thing.common.directory(),
    date: Thing.common.simpleDate(),

    content: Thing.common.simpleString(),

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
