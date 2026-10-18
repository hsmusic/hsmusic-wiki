import {readFile, stat, writeFile} from 'node:fs/promises';
import * as path from 'node:path';

import {V} from '#composite';
import {traverse} from '#node-utils';
import {chunkByConditions, compareArrays, transposeArrays} from '#sugar';
import Thing from '#thing';
import {isObject, isStringNonEmpty, anyOf, strictArrayOf} from '#validators';

import {
  documentModes,
  flattenThingLayoutToDocumentOrder,
  getThingLayoutForFilename,
  reorderDocumentsInYAMLSourceText,
} from '#yaml';

import {exposeConstant} from '#composite/control-flow';

function isSelectFollowingEntry(value) {
  isObject(value);

  const {length} = Object.keys(value);
  if (length !== 1) {
    throw new Error(`Expected object with 1 key, got ${length}`);
  }

  return true;
}

import {ThingSortingRule} from './ThingSortingRule.js';

export class DocumentSortingRule extends ThingSortingRule {
  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    pathnames: {
      flags: {update: true, expose: true},
      update: {
        validate:
          strictArrayOf(isStringNonEmpty),
      },
    },

    message: {
      flags: {update: true, expose: true},
      update: {validate: isStringNonEmpty},

      expose: {
        dependencies: ['filename'],
        transform: (value, {filename}) =>
          value ??
          `Sort ${filename}`,
      },
    },

    selectDocumentsFollowing: {
      flags: {update: true, expose: true},

      update: {
        validate:
          anyOf(
            isSelectFollowingEntry,
            strictArrayOf(isSelectFollowingEntry)),
      },

      compute: {
        transform: value =>
          (Array.isArray(value)
            ? value
            : [value]),
      },
    },

    selectDocumentsUnder: {
      flags: {update: true, expose: true},
      update: {validate: isStringNonEmpty},
    },

    // Expose only

    isDocumentSortingRule: exposeConstant(V(true)),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Sort Documents': {
        property: 'pathnames',
        transform(value) {
          if (Array.isArray(value)) {
            return value;
          } else if (typeof value === 'string') {
            return [value];
          } else {
            throw new Error(`Expected a string or an array`);
          }
        },
      },

      'Select Documents Following': {property: 'selectDocumentsFollowing'},
      'Select Documents Under': {property: 'selectDocumentsUnder'},
    },

    invalidFieldCombinations: [
      {message: `Specify only one of these`, fields: [
        'Select Documents Following',
        'Select Documents Under',
      ]},
    ],
  };

  async *getTargetedFilePaths({dataPath}) {
    for (const pathInYAML of this.pathnames) {
      const pathOnSystem =
        path.join(
          dataPath,
          pathInYAML.split(path.posix.sep).join(path.sep));

      let stats;
      try {
        stats = await stat(pathOnSystem);
      } catch {
        continue;
      }

      if (stats.isDirectory()) {
        const pathsOnSystem =
          await traverse(pathOnSystem, {
            filterFile: file => path.extname(file) === '.yaml',
          });

        const pathsInYAML =
          pathsOnSystem.map(pathOnSystem =>
            path.relative(dataPath, pathOnSystem)
              .split(path.sep)
              .join(path.posix.sep));

        yield* transposeArrays([pathsOnSystem, pathsInYAML]);
      } else {
        yield [pathOnSystem, pathInYAML];
      }
    }
  }

  static async apply(rule, {wikiData, dataPath, dry}) {
    const filePaths =
      await Array.fromAsync(rule.getTargetedFilePaths({dataPath}));

    const changes = new Map();
    let changedAny = false;

    for (const [pathOnSystem, pathInYAML] of filePaths) {
      const oldLayout = getThingLayoutForFilename(pathInYAML, wikiData);
      if (!oldLayout) continue;

      const newLayout = rule.#processLayout(oldLayout);

      const oldOrder = flattenThingLayoutToDocumentOrder(oldLayout);
      const newOrder = flattenThingLayoutToDocumentOrder(newLayout);
      const changedThisOne = compareArrays(oldOrder, newOrder);

      if (changedThisOne) {
        changes.set(pathOnSystem, newOrder)
        changedAny = true;
      }
    }

    if (!changedAny) {
      return {changed: false};
    }

    for (const [pathOnSystem, newOrder] of changes) {
      const oldSourceText = await readFile(pathOnSystem, 'utf8');
      const newSourceText = reorderDocumentsInYAMLSourceText(oldSourceText, newOrder);
      changes.set(pathOnSystem, newSourceText);
    }

    for (const [pathOnSystem, newSourceText] of changes) {
      await writeFile(pathOnSystem, newSourceText);
    }

    return {changed: true};
  }

  static async* applyAll(rules, {wikiData, dataPath, dry}) {
    const pathRulePairs =
      (await Promise.all(
        rules.map(rule =>
          Array.fromAsync(rule.getTargetedFilePaths({dataPath}))
            .then(filePaths => filePaths
              .map(([pathOnSystem, pathInYAML]) =>
                [pathOnSystem, pathInYAML, rule])))))
        .flat();

    pathRulePairs.sort((a, b) => a[0].localeCompare(b[0]));

    const pathRuleMap =
      new Map(
        chunkByConditions(pathRulePairs, [(a, b) => a[0] !== b[0]])
          .map(pairs => [pairs[0][0], {
            pathOnSystem: pairs[0][0],
            pathInYAML: pairs[0][1],
            rules: pairs.map(pair => pair[2]),
          }]));

    const changes = new Map();
    let anyFilesChanged = false;

    for (const {pathOnSystem, pathInYAML, rules} of pathRuleMap.values()) {
      const initialLayout = getThingLayoutForFilename(pathInYAML, wikiData);
      if (!initialLayout) {
        continue;
      }

      let currLayout = initialLayout;
      let prevLayout = initialLayout;
      let anyRulesHadEffect = false;

      for (const rule of rules) {
        currLayout = rule.#processLayout(currLayout);

        const prevOrder = flattenThingLayoutToDocumentOrder(prevLayout);
        const currOrder = flattenThingLayoutToDocumentOrder(currLayout);

        if (compareArrays(currOrder, prevOrder)) {
          yield {rule, path: pathInYAML, changed: false};
        } else {
          anyRulesHadEffect = true;
          yield {rule, path: pathInYAML, changed: true};
        }

        prevLayout = currLayout;
      }

      if (anyRulesHadEffect) {
        changes.set(pathOnSystem, currLayout);
        anyFilesChanged = true;
      }
    }

    if (dry) {
      return;
    }

    for (const [pathOnSystem, newLayout] of changes) {
      const newOrder = flattenThingLayoutToDocumentOrder(newLayout);
      changes.set(pathOnSystem, newOrder);
    }

    for (const [pathOnSystem, newOrder] of changes) {
      const oldSourceText = await readFile(pathOnSystem, 'utf8');
      const newSourceText = reorderDocumentsInYAMLSourceText(oldSourceText, newOrder);
      await writeFile(pathOnSystem, newSourceText);
    }
  }

  #processLayout(layout) {
    const fresh = {...layout};

    let sortable = null;
    switch (fresh.documentMode) {
      case documentModes.headerAndEntries:
        sortable = fresh.entryThings =
          fresh.entryThings.slice();
        break;

      case documentModes.allInOne:
        sortable = fresh.things =
          fresh.things.slice();
        break;

      default:
        throw new Error(`Invalid document type for sorting`);
    }

    if (this.selectDocumentsFollowing) {
      for (const entry of this.selectDocumentsFollowing) {
        const [field, value] = Object.entries(entry)[0];

        const after =
          sortable.findIndex(thing =>
            thing[Thing.yamlSourceDocument][field] === value);

        const different =
          after +
          sortable
            .slice(after)
            .findIndex(thing =>
              Object.hasOwn(thing[Thing.yamlSourceDocument], field) &&
              thing[Thing.yamlSourceDocument][field] !== value);

        const before =
          (different === -1
            ? sortable.length
            : different);

        const subsortable =
          sortable.slice(after + 1, before);

        this.sort(subsortable);

        sortable.splice(after + 1, before - after - 1, ...subsortable);
      }
    } else if (this.selectDocumentsUnder) {
      const field = this.selectDocumentsUnder;

      const indices =
        Array.from(sortable.entries())
          .filter(([_index, thing]) =>
            Object.hasOwn(thing[Thing.yamlSourceDocument], field))
          .map(([index, _thing]) => index);

      for (const [indicesIndex, after] of indices.entries()) {
        const before =
          (indicesIndex === indices.length - 1
            ? sortable.length
            : indices[indicesIndex + 1]);

        const subsortable =
          sortable.slice(after + 1, before);

        this.sort(subsortable);

        sortable.splice(after + 1, before - after - 1, ...subsortable);
      }
    } else {
      this.sort(sortable);
    }

    return fresh;
  }
}
