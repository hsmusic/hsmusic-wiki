export const FLASH_DATA_FILE = 'flashes.yaml';

import {input} from '#composite';
import find from '#find';
import {empty} from '#sugar';
import {sortFlashesChronologically} from '#sort';
import Thing from '#thing';
import {anyOf, isColor, isContentString, isDirectory, isNumber, isString}
  from '#validators';
import {parseContributors, parseDate, parseDimensions} from '#yaml';

import {withPropertyFromObject} from '#composite/data';
import {withParsedContentStringNodes} from '#composite/wiki-data';

import {
  exposeConstant,
  exposeDependency,
  exposeDependencyOrContinue,
  exposeUpdateValueOrContinue,
} from '#composite/control-flow';

import {
  color,
  commentary,
  commentatorArtists,
  contentString,
  contributionList,
  dimensions,
  directory,
  fileExtension,
  name,
  referenceList,
  simpleDate,
  thing,
  urls,
  wikiData,
} from '#composite/wiki-properties';

import {withFlashAct} from '#composite/things/flash';
import {withFlashSide} from '#composite/things/flash-act';

export class Flash extends Thing {
  static [Thing.referenceType] = 'flash';

  static [Thing.getPropertyDescriptors] = ({
    Artist,
    Track,
    FlashAct,
    WikiInfo,
  }) => ({
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

    coverArtDimensions: dimensions(),

    contributorContribs: contributionList({
      date: 'date',
      artistProperty: input.value('flashContributorContributions'),
    }),

    featuredTracks: referenceList({
      class: input.value(Track),
      find: input.value(find.track),
      data: 'trackData',
    }),

    urls: urls(),

    commentary: commentary(),
    creditSources: commentary(),

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

    wikiInfo: thing({
      class: input.value(WikiInfo),
    }),

    // Expose only

    commentatorArtists: commentatorArtists(),

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

      'Cover Art Dimensions': {
        property: 'coverArtDimensions',
        transform: parseDimensions,
      },

      'Featured Tracks': {property: 'featuredTracks'},

      'Contributors': {
        property: 'contributorContribs',
        transform: parseContributors,
      },

      'Commentary': {property: 'commentary'},
      'Credit Sources': {property: 'creditSources'},

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

    listTerminology: [
      withParsedContentStringNodes({
        from: input.updateValue({
          validate: isContentString,
        }),
      }),

      exposeDependencyOrContinue({
        dependency: '#parsedContentStringNodes',
        mode: input.value('empty'),
      }),

      withFlashSide(),

      withPropertyFromObject({
        object: '#flashSide',
        property: input.value('listTerminology'),
      }),

      exposeDependencyOrContinue({
        dependency: '#flashSide.listTerminology',
      }),

      exposeConstant({
        value: input.value(null),
      }),
    ],

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
    listTerminology: contentString(),

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
      'List Terminology': {property: 'listTerminology'},
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
      // JavaScript likes you.

      if (!empty(results) && !(results[0] instanceof FlashSide)) {
        throw new Error(`Expected a side at top of flash data file`);
      }

      let index = 0;
      let thing;
      for (; thing = results[index]; index++) {
        const flashSide = thing;
        const flashActRefs = [];

        if (results[index + 1] instanceof Flash) {
          throw new Error(`Expected an act to immediately follow a side`);
        }

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
