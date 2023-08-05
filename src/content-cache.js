import {getArgsForRelationsAndData} from './content-function.js';
import {quickLoadAllFromYAML} from './data/yaml.js';
import {compareArrays} from './util/sugar.js';

export class TupleMap {
  #store = [undefined, new WeakMap(), new Map()];

  #lifetime(value) {
    if (
      typeof value === 'object' && value !== null ||
      typeof value === 'function'
    ) {
      return 'weak';
    } else {
      return 'strong';
    }
  }

  #getSubstoreShallow(value, store) {
    const map = store[this.#lifetime(value) === 'weak' ? 1 : 2];
    if (map.has(value)) {
      return map.get(value);
    } else {
      const substore = [undefined, new WeakMap(), new Map()];
      map.set(value, substore);
      return substore;
    }
  }

  #getSubstoreDeep(tuple, store = this.#store) {
    if (tuple.length === 0) {
      return store;
    } else {
      const [first, ...rest] = tuple;
      return this.#getSubstoreDeep(rest, this.#getSubstoreShallow(first, store));
    }
  }

  get(tuple) {
    const store = this.#getSubstoreDeep(tuple);
    return store[0];
  }

  set(tuple, value) {
    const store = this.#getSubstoreDeep(tuple);
    store[0] = value;
    return value;
  }
}

export default class ContentCache {
  #contentFunctions = {};
  #extraDependencies = {};

  #contentDependenciesTree = {};
  #desiredContentFunctionCalls = [];

  #cachedRelationsLayouts = new TupleMap();
  #cachedRelationsSlots = new TupleMap();

  #relationIdentifier = Symbol();

  wikiData = {};

  constructor() {}

  desireContentFunction(functionName, args, levelOfDesire) {
    this.#desiredContentFunctionCalls.push({functionName, args, levelOfDesire});
  }

  #getPotentiallyDirectlyDependantContentFunctions(functionName) {
    const direct =
      Object.entries(this.#contentDependenciesTree)
        .filter(([name, dependencies]) => dependencies.has(functionName))
        .map(([name]) => name);

    return new Set(direct);
  }

  #getPotentiallyDependantContentFunctions(functionName) {
    const direct = this.#getPotentiallyDirectlyDependantContentFunctions(functionName);
    const indirect =
      Array.from(direct)
        .flatMap(name => Array.from(this.#getPotentiallyDirectlyDependantContentFunctions(name)));

    return new Set([...direct, ...indirect]);
  }

  #prepareRelations(functionName, args) {
    const tuple = [functionName, ...args];
    if (
      this.#cachedRelationsLayouts.get(tuple) &&
      this.#cachedRelationsSlots.get(tuple)
    ) {
      return;
    }

    const contentFunction = this.#contentFunctions[functionName];
    const argsForRelations =
      getArgsForRelationsAndData(contentFunction, this.wikiData, ...args);

    const listedDependencies = new Set(contentFunction.contentDependencies);

    // Note: "slots" here is a completely separate concept from HTML template
    // slots, which are handled completely within the content function. Here,
    // relation slots are just references to a position within the relations
    // layout that are referred to by a symbol - when the relation is ready,
    // its result will be "slotted" into the layout.
    const relationSlots = {};

    const relationSymbolMessage = (() => {
      let num = 1;
      return name => `#${num++} ${name}`;
    })();

    const relationFunction = (name, ...args) => {
      if (!listedDependencies.has(name)) {
        throw new Error(`Called relation('${name}') but ${functionName} doesn't list that dependency`);
      }

      const relationSymbol = Symbol(relationSymbolMessage(name));
      relationSlots[relationSymbol] = {name, args};
      return {[this.#relationIdentifier]: relationSymbol};
    };

    const relationsLayout =
      contentFunction.relations(relationFunction, ...argsForRelations);

    this.#cachedRelationsLayouts.set([functionName, ...args], relationsLayout);
    this.#cachedRelationsSlots.set([functionName, ...args], relationSlots);
  }

  getRelationsLayout(functionName, args) {
    this.#prepareRelations(functionName, args);
    return this.#cachedRelationsLayouts.get([functionName, ...args]);
  }

  getRelationsSlots(functionName, args) {
    this.#prepareRelations(functionName, args);
    return this.#cachedRelationsSlots.get([functionName, ...args]);
  }

  scoreContentFunctionDesirability(scoreFunctionName, scoreArgs) {
    const potentiallyDependantNames = this.#getPotentiallyDependantContentFunctions(scoreFunctionName);

    let score = 0;

    const recursive = (namesAndArgs, levelOfDesire) => {
      for (const {name, args} of namesAndArgs) {
        if (name === scoreFunctionName) {
          if (compareArrays(args, scoreArgs)) {
            score += levelOfDesire;
          }
        } else if (!potentiallyDependantNames.has(name)) {
          continue;
        }
        const slots = this.getRelationsSlots(name, args);
        const symbols = Object.getOwnPropertySymbols(slots);
        recursive(symbols.map(symbol => slots[symbol]), levelOfDesire);
      }
    };

    for (const {functionName: name, args, levelOfDesire} of this.#desiredContentFunctionCalls) {
      recursive([{name, args}], levelOfDesire);
    }

    return score;
  }

  /*
  evaluateContentFunction(functionName, args) {
  }
  */

  updateContentDependency(functionName, contentFunction) {
    this.#contentFunctions[functionName] =
      contentFunction;

    this.#contentDependenciesTree[functionName] =
      contentFunction.contentDependencies;
  }

  updateExtraDependency(dependencyName, value) {
    this.#extraDependencies[dependencyName] = value;
  }

  connectContentDependenciesWatcher(watcher) {
    watcher.on('update', functionName => {
      this.updateContentDependency(
        functionName,
        watcher.contentDependencies[functionName]);
    });
  }
}

(async function() {
  const {watchContentDependencies} = await import('./content/dependencies/index.js');
  const contentDependenciesWatcher = await watchContentDependencies();

  const cache = new ContentCache();
  cache.connectContentDependenciesWatcher(contentDependenciesWatcher);

  await new Promise(resolve => contentDependenciesWatcher.once('ready', resolve));

  cache.wikiData = await quickLoadAllFromYAML(process.env.HSMUSIC_DATA);

  for (const album of cache.wikiData.albumData) {
    cache.desireContentFunction('generateAlbumInfoPage', [album], 10000);
    cache.desireContentFunction('generateAlbumGalleryPage', [album], 10000);
    for (const track of album.tracks) {
      cache.desireContentFunction('generateTrackInfoPage', [track], 1);
    }
  }

  for (const album of cache.wikiData.albumData) {
    console.log(album, cache.scoreContentFunctionDesirability('linkAlbum', [album]));
  }
  // console.log(cache.scoreContentFunctionDesirability('linkAlbum', [cache.wikiData.albumData[0]]));
  // console.log(cache.scoreContentFunctionDesirability('linkAlbum', [cache.wikiData.albumData[1]]));
  // console.log(cache.scoreContentFunctionDesirability('linkAlbum', [cache.wikiData.albumData[2]]));
})().catch(err => console.error(err));
