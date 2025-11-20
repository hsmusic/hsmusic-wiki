export const DATA_ADVENTURE_DIRECTORY = 'adventure';

import * as path from 'node:path';

import {input} from '#composite';
import {traverse} from '#node-utils';
import Thing from '#thing';

import {exposeDependency} from '#composite/control-flow';
import {withPropertyFromObject} from '#composite/data';
import {directory, name, thing, thingList}
  from '#composite/wiki-properties';

// *thumb-twiddling*
import {Flash, FlashAct} from './flash.js';

export class Adventure extends Thing {
  static [Thing.referenceType] = 'adventure';

  static [Thing.getPropertyDescriptors] = ({FlashAct}) => ({
    // > Internal relationships

    acts: thingList({
      class: input.value(FlashAct),
    }),

    // > Identifying metadata

    name: name('Unnamed Adventure'),
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

    save(results) {
      const adventureData = [];
      const flashActData = [];
      const flashData = [];

      for (const {header: adventure, entries} of results) {
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
                flashData.push(flash);

                continue;
              }

              i--;
              break;
            }

            act.flashes = flashes;
            acts.push(act);
            flashActData.push(act);

            continue;
          }

          if (thing.isFlash) {
            throw new Error(`Flashes must be under a flash act`);
          }
        }

        adventure.acts = acts;
        adventureData.push(adventure);
      }

      return {
        adventureData,
        flashActData,
        flashData,
      };
    },
  });
}

export class AdventureFlash extends Flash {
  static [Thing.getPropertyDescriptors] = ({Adventure}) => ({
    // > Implicit relationships

    adventure: [
      withPropertyFromObject({
        object: 'act',
        property: input.value('adventure'),
      }),

      exposeDependency({
        dependency: '#act.adventure',
      }),
    ],
  });
}

export class AdventureFlashAct extends FlashAct {
  static [Thing.getPropertyDescriptors] = ({Adventure}) => ({
    // > Internal relationships

    adventure: thing({
      class: input.value(Adventure),
    }),
  });
}
