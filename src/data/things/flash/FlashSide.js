const FLASH_DATA_FILE = 'flashes.yaml';

import {V} from '#composite';
import {sortFlashesChronologically} from '#sort';
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
