export const FLASH_DATA_FILE = 'flashes.yaml';

import {input, V} from '#composite';
import {sortFlashesChronologically} from '#sort';
import Thing from '#thing';
import {anyOf, isColor, isContentString, isDirectory, isNumber, isString}
  from '#validators';

import {
  parseArtwork,
  parseAdditionalNames,
  parseCommentary,
  parseContributors,
  parseCreditingSources,
  parseDate,
  parseDimensions,
} from '#yaml';

import {withPropertyFromObject} from '#composite/data';

import {
  exposeConstant,
  exposeDependency,
  exposeUpdateValueOrContinue,
} from '#composite/control-flow';

import {
  color,
  commentatorArtists,
  constitutibleArtwork,
  contentString,
  contributionList,
  dimensions,
  directory,
  fileExtension,
  name,
  referenceList,
  simpleDate,
  soupyFind,
  soupyReverse,
  thing,
  thingList,
  urls,
} from '#composite/wiki-properties';

export class Flash extends Thing {
  static [Thing.referenceType] = 'flash';
  static [Thing.wikiData] = 'flashData';

  static [Thing.constitutibleProperties] = [
    'coverArtwork', // from inline fields
  ];

  static [Thing.getPropertyDescriptors] = ({
    AdditionalName,
    CommentaryEntry,
    CreditingSourcesEntry,
    FlashAct,
    Track,
    WikiInfo,
  }) => ({
    // Update & expose

    act: thing({
      class: input.value(FlashAct),
    }),

    name: name(V('Unnamed Flash')),

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

      withPropertyFromObject('act', V('color')),
      exposeDependency('#act.color'),
    ],

    date: simpleDate(),

    coverArtFileExtension: fileExtension(V('jpg')),

    coverArtDimensions: dimensions(),

    coverArtwork:
      constitutibleArtwork.fromYAMLFieldSpec
        .call(this, 'Cover Artwork'),

    contributorContribs: contributionList({
      date: 'date',
      artistProperty: input.value('flashContributorContributions'),
    }),

    featuredTracks: referenceList({
      class: input.value(Track),
      find: soupyFind.input('track'),
    }),

    urls: urls(),

    additionalNames: thingList({
      class: input.value(AdditionalName),
    }),

    commentary: thingList({
      class: input.value(CommentaryEntry),
    }),

    creditingSources: thingList({
      class: input.value(CreditingSourcesEntry),
    }),

    // Update only

    find: soupyFind(),
    reverse: soupyReverse(),

    // used for withMatchingContributionPresets (indirectly by Contribution)
    wikiInfo: thing({
      class: input.value(WikiInfo),
    }),

    // Expose only

    isFlash: exposeConstant(V(true)),

    commentatorArtists: commentatorArtists(),

    side: [
      withPropertyFromObject('act', V('side')),
      exposeDependency('#act.side'),
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

  static [Thing.reverseSpecs] = {
    flashesWhichFeature: {
      bindTo: 'flashData',

      referencing: flash => [flash],
      referenced: flash => flash.featuredTracks,
    },

    flashContributorContributionsBy:
      soupyReverse.contributionsBy('flashData', 'contributorContribs'),

    flashesWithCommentaryBy: {
      bindTo: 'flashData',

      referencing: flash => [flash],
      referenced: flash => flash.commentatorArtists,
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

      'Additional Names': {
        property: 'additionalNames',
        transform: parseAdditionalNames,
      },

      'Cover Artwork': {
        property: 'coverArtwork',
        transform:
          parseArtwork({
            single: true,
            thingProperty: 'coverArtwork',
            fileExtensionFromThingProperty: 'coverArtFileExtension',
            dimensionsFromThingProperty: 'coverArtDimensions',
          }),
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

      'Commentary': {
        property: 'commentary',
        transform: parseCommentary,
      },

      'Crediting Sources': {
        property: 'creditingSources',
        transform: parseCreditingSources,
      },

      'Review Points': {ignore: true},
    },
  };

  getOwnArtworkPath(artwork) {
    return [
      'media.flashArt',
      this.directory,
      artwork.fileExtension,
    ];
  }
}

export class FlashAct extends Thing {
  static [Thing.referenceType] = 'flash-act';
  static [Thing.friendlyName] = `Flash Act`;
  static [Thing.wikiData] = 'flashActData';

  static [Thing.getPropertyDescriptors] = ({Flash, FlashSide}) => ({
    // Update & expose

    side: thing({
      class: input.value(FlashSide),
    }),

    name: name(V('Unnamed Flash Act')),
    directory: directory(),
    color: color(),

    listTerminology: [
      exposeUpdateValueOrContinue({
        validate: input.value(isContentString),
      }),

      withPropertyFromObject('side', V('listTerminology')),
      exposeDependency('#side.listTerminology'),
    ],

    flashes: thingList({
      class: input.value(Flash),
    }),

    // Update only

    find: soupyFind(),
    reverse: soupyReverse(),

    // Expose only

    isFlashAct: exposeConstant(V(true)),
  });

  static [Thing.findSpecs] = {
    flashAct: {
      referenceTypes: ['flash-act'],
      bindTo: 'flashActData',
    },
  };

  static [Thing.reverseSpecs] = {
    flashActsWhoseFlashesInclude: {
      bindTo: 'flashActData',

      referencing: flashAct => [flashAct],
      referenced: flashAct => flashAct.flashes,
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
  static [Thing.wikiData] = 'flashSideData';

  static [Thing.getPropertyDescriptors] = ({FlashAct}) => ({
    // Update & expose

    name: name(V('Unnamed Flash Side')),
    directory: directory(),
    color: color(),
    listTerminology: contentString(),

    acts: thingList({
      class: input.value(FlashAct),
    }),

    // Update only

    find: soupyFind(),

    // Expose only

    isFlashSide: exposeConstant(V(true)),
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

  static [Thing.reverseSpecs] = {
    flashSidesWhoseActsInclude: {
      bindTo: 'flashSideData',

      referencing: flashSide => [flashSide],
      referenced: flashSide => flashSide.acts,
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

    connect(results) {
      let thing, i;

      for (i = 0; thing = results[i]; i++) {
        if (thing.isFlashSide) {
          const side = thing;
          const acts = [];

          for (i++; thing = results[i]; i++) {
            if (thing.isFlashAct) {
              const act = thing;
              const flashes = [];

              for (i++; thing = results[i]; i++) {
                if (thing.isFlash) {
                  const flash = thing;

                  flash.act = act;
                  flashes.push(flash);

                  continue;
                }

                i--;
                break;
              }

              act.side = side;
              act.flashes = flashes;
              acts.push(act);

              continue;
            }

            if (thing.isFlash) {
              throw new Error(`Flashes must be under an act`);
            }

            i--;
            break;
          }

          side.acts = acts;

          continue;
        }

        if (thing.isFlashAct) {
          throw new Error(`Acts must be under a side`);
        }

        if (thing.isFlash) {
          throw new Error(`Flashes must be under a side and act`);
        }
      }
    },

    sort({flashData}) {
      sortFlashesChronologically(flashData);
    },
  });
}
