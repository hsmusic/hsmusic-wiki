export const DATA_ADVENTURE_DIRECTORY = 'adventure';

import * as path from 'node:path';

import {input, V} from '#composite';
import {traverse} from '#node-utils';
import Thing from '#thing';

import {exposeConstant, exposeDependency}
  from '#composite/control-flow';
import {withPropertyFromObject} from '#composite/data';
import {directory, name, thing, thingList}
  from '#composite/wiki-properties';

// *thumb-twiddling*
import {Flash, FlashAct} from './flash.js';

export class Adventure extends Thing {
  static [Thing.referenceType] = 'adventure';
  static [Thing.wikiData] = 'adventureData';

  static [Thing.getPropertyDescriptors] = ({FlashAct}) => ({
    isAdventure: exposeConstant(V(true)),

    // > Internal relationships

    acts: thingList(V(FlashAct)),

    // > Identifying metadata

    name: name(V('Unnamed Adventure')),
    directory: directory(),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      // Identifying metadata

      'Adventure': {property: 'name'},
      'Directory': {property: 'directory'},
    },
  };

  static [Thing.getYamlLoadingSpec] = ({
    documentModes: {headerAndEntries},
    thingConstructors: {
      Adventure,
      AdventureFlashAct,
      AdventureFlash,
    },
  }) => ({
    title: `Process adventure files`,

    files: dataPath =>
      traverse(path.join(dataPath, DATA_ADVENTURE_DIRECTORY), {
        filterFile: name => path.extname(name) === '.yaml',
        prefixPath: DATA_ADVENTURE_DIRECTORY,
      }),

    documentMode: headerAndEntries,

    headerDocumentThing: Adventure,
    entryDocumentThing: document =>
      ('Act' in document
        ? AdventureFlashAct
        : AdventureFlash),

    connect({header: adventure, entries}) {
      const acts = [];

      let thing, i;
      for (i = 0; thing = entries[i]; i++) {
        if (thing.isFlashAct) {
          const act = thing;
          const flashes = [];

          for (i++; thing = entries[i]; i++) {
            if (thing.isFlash) {
              const flash = thing;

              flash.act = act;
              flashes.push(flash);

              continue;
            }

            i--;
            break;
          }

          act.adventure = adventure;
          act.flashes = flashes;
          acts.push(act);

          continue;
        }

        if (thing.isFlash) {
          throw new Error(`Flashes must be under a flash act`);
        }
      }

      adventure.acts = acts;
    },
  });
}

export class AdventureFlash extends Flash {
  static [Thing.getPropertyDescriptors] = ({Adventure}) => ({
    isAdventureFlash: exposeConstant(V(true)),

    // > Implicit relationships

    adventure: [
      withPropertyFromObject('act', V('adventure')),
      exposeDependency('#act.adventure'),
    ],
  });
}

export class AdventureFlashAct extends FlashAct {
  static [Thing.getPropertyDescriptors] = ({Adventure}) => ({
    isAdventureFlashAct: exposeConstant(V(true)),

    // > Internal relationships

    adventure: thing(V(Adventure)),
  });
}
