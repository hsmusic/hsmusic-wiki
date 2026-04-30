import {input, V} from '#composite';
import {atOffset} from '#sugar';
import Thing from '#thing';
import {isColor, isContentString, isString} from '#validators';

import {withPropertyFromObject} from '#composite/data';

import {
  exitWithoutDependency,
  exposeConstant,
  exposeDependency,
  exposeUpdateValueOrContinue,
} from '#composite/control-flow';

import {
  color,
  directory,
  name,
  simpleString,
  soupyFind,
  soupyReverse,
  thing,
  thingList,
  wikiData,
} from '#composite/wiki-properties';

export class FlashAct extends Thing {
  static [Thing.referenceType] = 'flash-act';
  static [Thing.friendlyName] = `Flash Act`;
  static [Thing.wikiData] = 'flashActData';

  static [Thing.getPropertyDescriptors] = ({Flash, FlashSide}) => ({
    // Update & expose

    side: thing(V(FlashSide)),

    name: name(V('Unnamed Flash Act')),

    title: simpleString(),

    shortName: [
      exposeUpdateValueOrContinue({
        validate: input.value(isString),
      }),

      exposeDependency('name'),
    ],

    directory: [
      {
        dependencies: ['name', 'shortName'],
        compute: (continuation, {name, shortName}) =>
          continuation({
            ['#name']:
              shortName ?? name,
          }),
      },

      directory('#name'),
    ],

    color: color(),

    titleColor: [
      exitWithoutDependency('title'),

      exposeUpdateValueOrContinue({
        validate: input.value(isColor),
      }),

      exposeDependency('color'),
    ],

    listTerminology: [
      exposeUpdateValueOrContinue({
        validate: input.value(isContentString),
      }),

      withPropertyFromObject('side', V('listTerminology')),
      exposeDependency('#side.listTerminology'),
    ],

    flashes: thingList(V(Flash)),

    // Update only

    find: soupyFind(),
    reverse: soupyReverse(),

    // used for nearbyActs
    flashActData: wikiData(V(FlashAct)),

    // Expose only

    isFlashAct: exposeConstant(V(true)),

    previousAct: {
      flags: {expose: true},
      expose: {
        dependencies: ['this', 'side', '_flashActData'],
        compute({
          ['this']: thisFlashAct,
          ['side']: ownSide,
          ['_flashActData']: flashActData,
        }) {
          const indexIn = array => array.indexOf(thisFlashAct);
          const isFirstIn = array => indexIn(array) === 0;
          const previousIn = array => atOffset(array, indexIn(array), -1);

          if (isFirstIn(flashActData)) {
            return null;
          }

          if (isFirstIn(ownSide.acts)) {
            if (ownSide.isolateActs) {
              return null;
            } else {
              const lastInPreviousSide = previousIn(flashActData);
              if (lastInPreviousSide.side.isolateActs) {
                return null;
              } else {
                return lastInPreviousSide;
              }
            }
          }

          return previousIn(ownSide.acts);
        },
      },
    },

    nextAct: {
      flags: {expose: true},
      expose: {
        dependencies: ['this', 'side', '_flashActData'],
        compute({
          ['this']: thisFlashAct,
          ['side']: ownSide,
          ['_flashActData']: flashActData,
        }) {
          const indexIn = array => array.indexOf(thisFlashAct);
          const isLastIn = array => indexIn(array) === array.length - 1;
          const nextIn = array => atOffset(array, indexIn(array), +1);

          if (isLastIn(flashActData)) {
            return null;
          }

          if (isLastIn(ownSide.acts)) {
            if (ownSide.isolateActs) {
              return null;
            } else {
              const firstInNextSide = nextIn(flashActData);
              if (firstInNextSide.side.isolateActs) {
                return null;
              } else {
                return firstInNextSide;
              }
            }
          }

          return nextIn(ownSide.acts);
        },
      },
    },

    previousActs: {
      flags: {expose: true},
      expose: {
        dependencies: ['previousAct'],
        compute: ({previousAct}) =>
          (previousAct
            ? [...previousAct.previousActs, previousAct]
            : []),
      },
    },

    nextActs: {
      flags: {expose: true},
      expose: {
        dependencies: ['nextAct'],
        compute: ({nextAct}) =>
          (nextAct
            ? [nextAct, ...nextAct.nextActs]
            : []),
      },
    },

    nearbyActs: {
      flags: {expose: true},
      expose: {
        dependencies: ['previousActs', 'nextActs', 'this'],
        compute: ({previousActs, nextActs, this: thisAct}) =>
          [...previousActs, thisAct, ...nextActs],
      },
    },
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
      'Title': {property: 'title'},
      'Short': {property: 'shortName'},
      'Directory': {property: 'directory'},

      'Color': {property: 'color'},
      'Title Color': {property: 'titleColor'},

      'List Terminology': {property: 'listTerminology'},

      'Review Points': {ignore: true},
    },
  };
}
