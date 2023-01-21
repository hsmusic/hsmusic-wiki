import Thing from './thing.js';

export class Release extends Thing {
  static [Thing.referenceType] = 'release';

  static [Thing.getPropertyDescriptors] = ({
    Track,
  }) => ({
    // Update & expose

    name: Thing.common.name('Unnamed Release'),
    color: Thing.common.color(),
    directory: Thing.common.directory(),

    date: Thing.common.simpleDate(),

    hasTrackArt: Thing.common.flag(true),

    trackSections: Thing.common.trackSections(),

    // Update only

    trackData: Thing.common.wikiData(Track),
  })
}
