import {input} from '#composite';
import find from '#find';

import {
  anyOf,
  isColor,
  isDirectory,
  isNumber,
  isString,
} from '#validators';

import {exposeDependency, exposeUpdateValueOrContinue}
  from '#composite/control-flow';
import {withPropertyFromObject} from '#composite/data';

import {
  color,
  contentString,
  contributionList,
  directory,
  fileExtension,
  name,
  referenceList,
  simpleDate,
  urls,
  wikiData,
} from '#composite/wiki-properties';

import {withFlashAct} from '#composite/things/flash';

import Thing from './thing.js';

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
      update: {validate: anyOf(isString, isNumber)},

      expose: {
        transform: (value) => (value === null ? null : value.toString()),
      },
    },

    color: [
      exposeUpdateValueOrContinue({
        validate: input.value(isColor),
      }),

      withFlashAct(),

      withPropertyFromObject({
        object: '#flashAct',
        property: input.value('color'),
      }),

      exposeDependency({dependency: '#flashAct.color'}),
    ],

    date: simpleDate(),

    coverArtFileExtension: fileExtension('jpg'),

    contributorContribs: contributionList(),

    featuredTracks: referenceList({
      class: input.value(Track),
      find: input.value(find.track),
      data: 'trackData',
    }),

    urls: urls(),

    // Update only

    artistData: wikiData({
      class: input.value(Artist),
    }),

    trackData: wikiData({
      class: input.value(Track),
    }),

    flashActData: wikiData({
      class: input.value(FlashAct),
    }),

    // Expose only

    act: {
      flags: {expose: true},

      expose: {
        dependencies: ['this', 'flashActData'],

        compute: ({this: flash, flashActData}) =>
          flashActData.find((act) => act.flashes.includes(flash)) ?? null,
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
  static [Thing.referenceType] = 'flash-act';
  static [Thing.friendlyName] = `Flash Act`;

  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    name: name('Unnamed Flash Act'),
    directory: directory(),
    color: color(),
    listTerminology: contentString(),

    jump: contentString(),

    jumpColor: {
      flags: {update: true, expose: true},
      update: {validate: isColor},
      expose: {
        dependencies: ['color'],
        transform: (jumpColor, {color}) =>
          jumpColor ?? color,
      }
    },

    flashes: referenceList({
      class: input.value(Flash),
      find: input.value(find.flash),
      data: 'flashData',
    }),

    // Update only

    flashData: wikiData({
      class: input.value(Flash),
    }),
  })
}
