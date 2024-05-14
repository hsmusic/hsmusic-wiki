import FlexSearch from '../lib/flexsearch/flexsearch.bundle.module.min.js';

import {makeSearchIndex, searchSpec} from '../shared-util/search-spec.js';

import {
  empty,
  groupArray,
  promiseWithResolvers,
  stitchArrays,
  unique,
  withEntries,
} from '../shared-util/sugar.js';

import {loadDependency} from './module-import-shims.js';

// Will be loaded from dependencies.
let decompress;
let unpack;

let idb;

let status = null;
let indexes = null;

globalThis.onmessage = handleWindowMessage;
postStatus('alive');

Promise.all([
  loadDependencies(),
  loadDatabase(),
]).then(main)
  .then(
    () => {
      postStatus('ready');
    },
    error => {
      console.error(`Search worker setup error:`, error);
      postStatus('setup-error');
    });

async function loadDependencies() {
  const {compressJSON} =
    await loadDependency.fromWindow('../lib/compress-json/bundle.min.js');

  const msgpackr =
    await loadDependency.fromModuleExports('../lib/msgpackr/index.js');

  ({decompress} = compressJSON);
  ({unpack} = msgpackr);
}

async function promisifyIDBRequest(request) {
  const {promise, resolve, reject} = promiseWithResolvers();

  request.addEventListener('success', () => resolve(request.result));
  request.addEventListener('error', () => reject(request.error));

  return promise;
}

async function* iterateIDBObjectStore(store, query) {
  const request =
    store.openCursor(query);

  let promise, resolve, reject;
  let cursor;

  request.onsuccess = () => {
    cursor = request.result;
    if (cursor) {
      resolve({done: false, value: [cursor.key, cursor.value]});
    } else {
      resolve({done: true});
    }
  };

  request.onerror = () => {
    reject(request.error);
  };

  do {
    ({promise, resolve, reject} = promiseWithResolvers());

    const result = await promise;

    if (result.done) {
      return;
    }

    yield result.value;

    cursor.continue();
  } while (true);
}

async function loadCachedIndexFromIDB() {
  if (!idb) return null;

  const transaction =
    idb.transaction(['indexes'], 'readwrite');

  const store =
    transaction.objectStore('indexes');

  const result = {};

  for await (const [key, object] of iterateIDBObjectStore(store)) {
    result[key] = object;
  }

  return result;
}

async function loadDatabase() {
  const request =
    globalThis.indexedDB.open('hsmusicSearchDatabase', 4);

  request.addEventListener('upgradeneeded', () => {
    const idb = request.result;

    idb.createObjectStore('indexes', {
      keyPath: 'key',
    });
  });

  try {
    idb = await promisifyIDBRequest(request);
  } catch (error) {
    console.warn(`Couldn't load search IndexedDB - won't use an internal cache.`);
    console.warn(request.error);
    idb = null;
  }
}

function rebase(path) {
  return `/search-data/` + path;
}

async function main() {
  let background;

  background =
    Promise.all([
      fetch(rebase('index.json'))
        .then(resp => resp.json()),

      loadCachedIndexFromIDB(),
    ]);

  indexes =
    withEntries(searchSpec, entries => entries
      .map(([key, descriptor]) => [
        key,
        makeSearchIndex(descriptor, {FlexSearch}),
      ]));

  const [indexData, idbIndexData] = await background;

  const keysNeedingFetch =
    (idbIndexData
      ? Object.keys(indexData)
          .filter(key =>
            indexData[key].md5 !==
            idbIndexData[key]?.md5)
      : Object.keys(indexData));

  const keysFromCache =
    Object.keys(indexData)
      .filter(key => !keysNeedingFetch.includes(key))

  const fetchPromises =
    keysNeedingFetch
      .map(key => rebase(key + '.json.msgpack'))
      .map(url => fetch(url));

  const fetchBlobPromises =
    fetchPromises
      .map(promise => promise
        .then(response => response.blob()));

  const fetchArrayBufferPromises =
    fetchBlobPromises
      .map(promise => promise
        .then(blob => blob.arrayBuffer()));

  const cacheArrayBufferPromises =
    keysFromCache
      .map(key => idbIndexData[key])
      .map(({cachedBinarySource}) =>
        cachedBinarySource.arrayBuffer());

  function arrayBufferToJSON(data) {
    data = new Uint8Array(data);
    data = unpack(data);
    data = decompress(data);
    return data;
  }

  function importIndexes(keys, jsons) {
    stitchArrays({key: keys, json: jsons})
      .forEach(({key, json}) => {
        importIndex(key, json);
      });
  }

  if (idb) {
    console.debug(`Reusing indexes from search cache:`, keysFromCache);
    console.debug(`Fetching indexes anew:`, keysNeedingFetch);
  }

  await Promise.all([
    async () => {
      const cacheArrayBuffers =
        await Promise.all(cacheArrayBufferPromises);

      const cacheJSONs =
        cacheArrayBuffers
          .map(arrayBufferToJSON);

      importIndexes(keysFromCache, cacheJSONs);
    },

    async () => {
      const fetchArrayBuffers =
        await Promise.all(fetchArrayBufferPromises);

      const fetchJSONs =
        fetchArrayBuffers
          .map(arrayBufferToJSON);

      importIndexes(keysNeedingFetch, fetchJSONs);
    },

    async () => {
      if (!idb) return;

      const fetchBlobs =
        await Promise.all(fetchBlobPromises);

      const transaction =
        idb.transaction(['indexes'], 'readwrite');

      const store =
        transaction.objectStore('indexes');

      for (const {key, blob} of stitchArrays({
        key: keysNeedingFetch,
        blob: fetchBlobs,
      })) {
        const value = {
          key,
          md5: indexData[key].md5,
          cachedBinarySource: blob,
        };

        try {
          await promisifyIDBRequest(store.put(value));
        } catch (error) {
          console.warn(`Error saving ${key} to internal search cache:`, value);
          console.warn(error);
          continue;
        }
      }
    },
  ].map(fn => fn()));
}

function importIndex(indexKey, indexData) {
  // If this fails, it's because an outdated index was cached.
  // TODO: If this fails, try again once with a cache busting url.
  for (const [key, value] of Object.entries(indexData)) {
    indexes[indexKey].import(key, JSON.stringify(value));
  }
}

function handleWindowMessage(message) {
  switch (message.data.kind) {
    case 'action':
      handleWindowActionMessage(message);
      break;

    default:
      console.warn(`Unknown message kind -> to search worker:`, message.data);
      break;
  }
}

async function handleWindowActionMessage(message) {
  const {id} = message.data;

  if (!id) {
    console.warn(`Action without id -> to search worker:`, message.data);
    return;
  }

  if (status !== 'ready') {
    return postActionResult(id, 'reject', 'not ready');
  }

  let value;

  switch (message.data.action) {
    case 'search':
      value = await performSearchAction(message.data.options);
      break;

    default:
      console.warn(`Unknown action "${message.data.action}" -> to search worker:`, message.data);
      return postActionResult(id, 'reject', 'unknown action');
  }

  await postActionResult(id, 'resolve', value);
}

function postStatus(newStatus) {
  status = newStatus;
  globalThis.postMessage({
    kind: 'status',
    status: newStatus,
  });
}

function postActionResult(id, status, value) {
  globalThis.postMessage({
    kind: 'result',
    id,
    status,
    value,
  });
}

function performSearchAction({query, options}) {
  const {generic, ...otherIndexes} = indexes;

  const genericResults =
    queryGenericIndex(generic, query, options);

  const otherResults =
    withEntries(otherIndexes, entries => entries
      .map(([indexName, index]) => [
        indexName,
        index.search(query, options),
      ]));

  return {
    generic: genericResults,
    ...otherResults,
  };
}

function queryGenericIndex(index, query, options) {
  const interestingFieldCombinations = [
    ['primaryName', 'contributors', 'groups'],
    ['primaryName', 'groups'],
    ['contributors', 'groups'],
    ['primaryName', 'contributors'],
    ['primaryName'],
  ];

  const interestingFields =
    unique(interestingFieldCombinations.flat());

  const terms = query.split(' ');

  const particles = particulate(terms);

  const groupedParticles =
    groupArray(particles, ({length}) => length);

  const queriesBy = keys =>
    (groupedParticles.get(keys.length) ?? [])
      .flatMap(permutations)
      .map(values => values.map(({terms}) => terms.join(' ')))
      .map(values => Object.fromEntries(stitchArrays([keys, values])));

  const boilerplate = queryBoilerplate(index);

  const particleResults =
    Object.fromEntries(
      interestingFields.map(field => [
        field,
        Object.fromEntries(
          particles.flat()
            .map(({terms}) => terms.join(' '))
            .map(query => [
              query,
              new Set(
                boilerplate
                  .query(query, {
                    ...options,
                    field,
                    limit: Infinity,
                  })
                  .fieldResults[field]),
            ])),
      ]));

  const results = new Set();

  for (const interestingFieldCombination of interestingFieldCombinations) {
    for (const query of queriesBy(interestingFieldCombination)) {
      const idToMatchingFieldsMap = new Map();
      for (const [field, fieldQuery] of Object.entries(query)) {
        for (const id of particleResults[field][fieldQuery]) {
          if (idToMatchingFieldsMap.has(id)) {
            idToMatchingFieldsMap.get(id).push(field);
          } else {
            idToMatchingFieldsMap.set(id, [field]);
          }
        }
      }

      const commonAcrossFields =
        Array.from(idToMatchingFieldsMap.entries())
          .filter(([id, matchingFields]) =>
            matchingFields.length === interestingFieldCombination.length)
          .map(([id]) => id);

      for (const result of commonAcrossFields) {
        results.add(result);
      }
    }
  }

  return boilerplate.constitute(results);
}

function particulate(terms) {
  if (empty(terms)) return [];

  const results = [];

  for (let slice = 1; slice <= 2; slice++) {
    if (slice === terms.length) {
      break;
    }

    const front = terms.slice(0, slice);
    const back = terms.slice(slice);

    results.push(...
      particulate(back)
        .map(result => [
          {terms: front},
          ...result
        ]));
  }

  results.push([{terms}]);

  return results;
}

// This function doesn't even come close to "performant",
// but it only operates on small data here.
function permutations(array) {
  switch (array.length) {
    case 0:
      return [];

    case 1:
      return [array];

    default:
      return array.flatMap((item, index) => {
        const behind = array.slice(0, index);
        const ahead = array.slice(index + 1);
        return (
          permutations([...behind, ...ahead])
            .map(rest => [item, ...rest]));
      });
  }
}

function queryBoilerplate(index) {
  const idToDoc = {};

  return {
    idToDoc,

    constitute: (ids) =>
      Array.from(ids)
        .map(id => ({id, doc: idToDoc[id]})),

    query: (query, options) => {
      const rawResults =
        index.search(query, options);

      const fieldResults =
        Object.fromEntries(
          rawResults
            .map(({field, result}) => [
              field,
              result.map(result =>
                (typeof result === 'string'
                  ? result
                  : result.id)),
            ]));

      Object.assign(
        idToDoc,
        Object.fromEntries(
          rawResults
            .flatMap(({result}) => result)
            .map(({id, doc}) => [id, doc])));

      return {rawResults, fieldResults};
    },
  };
}
