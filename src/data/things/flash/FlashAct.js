
import {input, V} from '#composite';
import Thing from '#thing';
import {isContentString} from '#validators';

import {withPropertyFromObject} from '#composite/data';
import {exposeConstant, exposeDependency, exposeUpdateValueOrContinue}
  from '#composite/control-flow';
import {color, directory, name, soupyFind, soupyReverse, thing, thingList}
  from '#composite/wiki-properties';

export class FlashAct extends Thing {
  static [Thing.referenceType] = 'flash-act';
  static [Thing.friendlyName] = `Flash Act`;
  static [Thing.wikiData] = 'flashActData';

  static [Thing.getPropertyDescriptors] = ({Flash, FlashSide}) => ({
    // Update & expose

    side: thing(V(FlashSide)),

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

    flashes: thingList(V(Flash)),

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
