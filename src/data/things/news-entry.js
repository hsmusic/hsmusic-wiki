import Thing, {
  directory,
  name,
  simpleDate,
  simpleString,
} from './thing.js';

export class NewsEntry extends Thing {
  static [Thing.referenceType] = 'news-entry';

  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    name: name('Unnamed News Entry'),
    directory: directory(),
    date: simpleDate(),

    content: simpleString(),

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
