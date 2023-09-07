import find from '#find';

import {
  isColor,
  isDirectory,
  isNumber,
  isString,
  oneOf,
} from '#validators';

import Thing, {
  dynamicContribs,
  color,
  contribsByRef,
  fileExtension,
  name,
  referenceList,
  resolvedReferenceList,
  simpleDate,
  simpleString,
  urls,
  wikiData,
} from './thing.js';

export class Flash extends Thing {
  static [Thing.referenceType] = 'flash';

  static [Thing.getPropertyDescriptors] = ({Artist, Track, FlashAct}) => ({
    // Update & expose

    name: name('Unnamed Flash'),

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

    date: simpleDate(),

    coverArtFileExtension: fileExtension('jpg'),

    contributorContribsByRef: contribsByRef(),

    featuredTracksByRef: referenceList(Track),

    urls: urls(),

    // Update only

    artistData: wikiData(Artist),
    trackData: wikiData(Track),
    flashActData: wikiData(FlashAct),

    // Expose only

    contributorContribs: dynamicContribs('contributorContribsByRef'),

    featuredTracks: resolvedReferenceList({
      list: 'featuredTracksByRef',
      data: 'trackData',
      find: find.track,
    }),

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
  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    name: name('Unnamed Flash Act'),
    color: color(),
    anchor: simpleString(),
    jump: simpleString(),

    jumpColor: {
      flags: {update: true, expose: true},
      update: {validate: isColor},
      expose: {
        dependencies: ['color'],
        transform: (jumpColor, {color}) =>
          jumpColor ?? color,
      }
    },

    flashesByRef: referenceList(Flash),

    // Update only

    flashData: wikiData(Flash),

    // Expose only

    flashes: resolvedReferenceList({
      list: 'flashesByRef',
      data: 'flashData',
      find: find.flash,
    }),
  })
}
