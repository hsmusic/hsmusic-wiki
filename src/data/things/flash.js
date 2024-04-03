export const FLASH_DATA_FILE = 'flashes.yaml';

import {input} from '#composite';
import find from '#find';
import {sortFlashesChronologically} from '#sort';
import Thing from '#thing';
import {anyOf, isColor, isDirectory, isNumber, isString} from '#validators';
import {parseDate, parseContributors} from '#yaml';

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
import {withFlashSide} from '#composite/things/flash-act';

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

    act: [
      withFlashAct(),
      exposeDependency({dependency: '#flashAct'}),
    ],

    side: [
      withFlashAct(),

      withPropertyFromObject({
        object: '#flashAct',
        property: input.value('side'),
      }),

      exposeDependency({dependency: '#flashAct.side'}),
    ],
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

  static [Thing.findSpecs] = {
    flash: {
      referenceTypes: ['flash'],
      bindTo: 'flashData',
    },
  };

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Flash': {property: 'name'},
      'Directory': {property: 'directory'},
      'Page': {property: 'page'},
      'Color': {property: 'color'},
      'URLs': {property: 'urls'},

      'Date': {
        property: 'date',
        transform: parseDate,
      },

      'Cover Art File Extension': {property: 'coverArtFileExtension'},

      'Featured Tracks': {property: 'featuredTracks'},
      'Contributors': {
        property: 'contributorContribs',
        transform: parseContributors,
      },

      'Review Points': {ignore: true},
    },
  };
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

    flashes: referenceList({
      class: input.value(Flash),
      find: input.value(find.flash),
      data: 'flashData',
    }),

    // Update only

    flashData: wikiData({
      class: input.value(Flash),
    }),

    flashSideData: wikiData({
      class: input.value(FlashSide),
    }),

    // Expose only

    side: [
      withFlashSide(),
      exposeDependency({dependency: '#flashSide'}),
    ],
  });

  static [Thing.findSpecs] = {
    flashAct: {
      referenceTypes: ['flash-act'],
      bindTo: 'flashActData',
    },
  };

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Act': {property: 'name'},
      'Directory': {property: 'directory'},

      'Color': {property: 'color'},
      'List Terminology': {property: 'listTerminology'},

      'Review Points': {ignore: true},
    },
  };
}

export class FlashSide extends Thing {
  static [Thing.referenceType] = 'flash-side';
  static [Thing.friendlyName] = `Flash Side`;

  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    name: name('Unnamed Flash Side'),
    directory: directory(),
    color: color(),

    acts: referenceList({
      class: input.value(FlashAct),
      find: input.value(find.flashAct),
      data: 'flashActData',
    }),

    // Update only

    flashActData: wikiData({
      class: input.value(FlashAct),
    }),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Side': {property: 'name'},
      'Directory': {property: 'directory'},
      'Color': {property: 'color'},
    },
  };

  static [Thing.findSpecs] = {
    flashSide: {
      referenceTypes: ['flash-side'],
      bindTo: 'flashSideData',
    },
  };

  static [Thing.getYamlLoadingSpec] = ({
    documentModes: {allInOne},
    thingConstructors: {Flash, FlashAct},
  }) => ({
    title: `Process flashes file`,
    file: FLASH_DATA_FILE,

    documentMode: allInOne,
    documentThing: document =>
      ('Side' in document
        ? FlashSide
     : 'Act' in document
        ? FlashAct
        : Flash),

    save(results) {
      let thing;
      for (let index = 0; thing = results[index]; index++) {
        if (index === 0 && !(thing instanceof FlashSide)) {
          throw new Error(`Expected a side at top of flash data file`);
        }

        // JavaScript likes you.
        const flashSide = thing;
        const flashActRefs = [];
        for (
          index++;
          (thing = results[index]) && thing instanceof FlashAct;
          index++
        ) {
          const flashAct = thing;
          const flashRefs = [];
          for (
            index++;
            (thing = results[index]) && thing instanceof Flash;
            index++
          ) {
            flashRefs.push(Thing.getReference(thing));
          }
          index--;
          flashAct.flashes = flashRefs;
          flashActRefs.push(Thing.getReference(flashAct));
        }
        index--;
        flashSide.acts = flashActRefs;
      }

      const flashData = results.filter(x => x instanceof Flash);
      const flashActData = results.filter(x => x instanceof FlashAct);
      const flashSideData = results.filter(x => x instanceof FlashSide);

      return {flashData, flashActData, flashSideData};
    },

    sort({flashData}) {
      sortFlashesChronologically(flashData);
    },
  });
}
