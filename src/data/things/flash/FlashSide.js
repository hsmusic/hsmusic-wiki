import {V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';
import {color, contentString, directory, name, soupyFind, thingList}
  from '#composite/wiki-properties';

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

    acts: thingList(V(FlashAct)),

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
}
