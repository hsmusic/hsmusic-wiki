import find from '#find';

import Thing from './thing.js';

export class Flash extends Thing {
  static [Thing.referenceType] = 'flash';

  static [Thing.getPropertyDescriptors] = ({
    Artist,
    Track,
    FlashAct,

    validators: {
      isDirectory,
      isNumber,
      isString,
      oneOf,
    },
  }) => ({
    // Update & expose

    name: Thing.common.name('Unnamed Flash'),

    directory: {
      flags: {update: true, expose: true},
      update: {validate: isDirectory},

      // Flashes expose directory differently from other Things! Their
      // default directory is dependent on the page number (or ID), not
      // the name.
      expose: {
        dependencies: ['page'],
        transform(directory, {page}) {
          if (directory === null && page === null) return null;
          else if (directory === null) return page;
          else return directory;
        },
      },
    },

    page: {
      flags: {update: true, expose: true},
      update: {validate: oneOf(isString, isNumber)},

      expose: {
        transform: (value) => (value === null ? null : value.toString()),
      },
    },

    date: Thing.common.simpleDate(),

    coverArtFileExtension: Thing.common.fileExtension('jpg'),

    contributorContribsByRef: Thing.common.contribsByRef(),

    featuredTracksByRef: Thing.common.referenceList(Track),

    urls: Thing.common.urls(),

    // Update only

    artistData: Thing.common.wikiData(Artist),
    trackData: Thing.common.wikiData(Track),
    flashActData: Thing.common.wikiData(FlashAct),

    // Expose only

    contributorContribs: Thing.common.dynamicContribs('contributorContribsByRef'),

    featuredTracks: Thing.common.dynamicThingsFromReferenceList(
      'featuredTracksByRef',
      'trackData',
      find.track
    ),

    act: {
      flags: {expose: true},

      expose: {
        dependencies: ['this', 'flashActData'],

        compute: ({this: flash, flashActData}) =>
          flashActData.find((act) => act.flashes.includes(flash)) ?? null,
      },
    },

    color: {
      flags: {expose: true},

      expose: {
        dependencies: ['this', 'flashActData'],

        compute: ({this: flash, flashActData}) =>
          flashActData.find((act) => act.flashes.includes(flash))?.color ?? null,
      },
    },
  });

  static [Thing.getSerializeDescriptors] = ({
    serialize: S,
  }) => ({
    name: S.id,
    page: S.id,
    directory: S.id,
    date: S.id,
    contributors: S.toContribRefs,
    tracks: S.toRefs,
    urls: S.id,
    color: S.id,
  });
}

export class FlashAct extends Thing {
  static [Thing.getPropertyDescriptors] = ({
    validators: {
      isColor,
    },
  }) => ({
    // Update & expose

    name: Thing.common.name('Unnamed Flash Act'),
    color: Thing.common.color(),
    anchor: Thing.common.simpleString(),
    jump: Thing.common.simpleString(),

    jumpColor: {
      flags: {update: true, expose: true},
      update: {validate: isColor},
      expose: {
        dependencies: ['color'],
        transform: (jumpColor, {color}) =>
          jumpColor ?? color,
      }
    },

    flashesByRef: Thing.common.referenceList(Flash),

    // Update only

    flashData: Thing.common.wikiData(Flash),

    // Expose only

    flashes: Thing.common.dynamicThingsFromReferenceList('flashesByRef', 'flashData', find.flash),
  })
}
