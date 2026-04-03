import FlexSearch from '../lib/flexsearch/flexsearch.bundle.module.min.js';

import {default as searchSpec, makeSearchIndex}
  from '../shared-util/search-shape.js';

import {
  empty,
  groupArray,
  permutations,
  promiseWithResolvers,
  stitchArrays,
  unique,
  withEntries,
} from '../shared-util/sugar.js';

import {loadDependency} from './module-import-shims.js';
import {fetchWithProgress} from './xhr-util.js';

// Will be loaded from dependencies.
let decompress;
let unpack;

let idb;

let status = null;
let indexes = null;

onmessage = handleWindowMessage;
onerror = handleRuntimeError;
onunhandledrejection = handleRuntimeError;
postStatus('alive');

Promise.all([
  loadDependencies(),
  loadDatabase(),
]).then(() => main())
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
  } catch {
    console.warn(`Couldn't load search IndexedDB - won't use an internal cache.`);
    console.warn(request.error);
    idb = null;
  }
}

function rebase(path) {
  return `/search-data/` + path;
}

async function prepareIndexData() {
  return Promise.all([
    fetch(rebase('index.json'))
      .then(resp => resp.json()),

    loadCachedIndexFromIDB(),
  ]).then(
      ([indexData, idbIndexData]) =>
        ({indexData, idbIndexData}));
}

function fetchIndexes(keysNeedingFetch) {
  if (!empty(keysNeedingFetch)) {
    postMessage({
      kind: 'download-begun',
      context: 'search-indexes',
      keys: keysNeedingFetch,
    });
  }

  return (
    keysNeedingFetch.map(key =>
      fetchWithProgress(
        rebase(key + '.json.msgpack'),
        progress => {
          postMessage({
            kind: 'download-progress',
            context: 'search-indexes',
            progress: progress / 1.00,
            key,
          });
        }).then(response => {
            postMessage({
              kind: 'download-complete',
              context: 'search-indexes',
              key,
            });

            return response;
          })));
}

async function main(fromRetry = false) {
  const prepareIndexDataPromise = prepareIndexData();

  indexes =
    withEntries(searchSpec, entries => entries
      .map(([key, descriptor]) => [
        key,
        makeSearchIndex(descriptor, {FlexSearch}),
      ]));

  const {indexData, idbIndexData} = await prepareIndexDataPromise;

  const understoodKeys = Object.keys(searchSpec);
  const unexpectedKeysFromCache =
    Object.keys(idbIndexData)
      .filter(key => !understoodKeys.includes(key));

  // This step is largely "unnecessary" because the rest of the code pays
  // attention to which keys are understood anyway, but we delete unexpected
  // keys from the index anyway, to trim stored data that isn't being used.
  if (idb && !empty(unexpectedKeysFromCache)) {
    for (const key of unexpectedKeysFromCache) {
      console.warn(`Unexpected search index in cache, deleting: ${key}`);
    }

    const transaction =
      idb.transaction(['indexes'], 'readwrite');

    const store =
      transaction.objectStore('indexes');

    for (const [key] of unexpectedKeysFromCache) {
      try {
        await promisifyIDBRequest(store.delete(key));
      } catch (error) {
        console.warn(`Error deleting ${key} from internal search cache`);
        console.warn(error);
        continue;
      }
    }
  }

  const keysNeedingFetch =
    (idbIndexData
      ? Object.keys(indexData)
          .filter(key => understoodKeys.includes(key))
          .filter(key =>
            indexData[key].md5 !==
            idbIndexData[key]?.md5)
      : Object.keys(indexData)
          .filter(key => understoodKeys.includes(key)));

  const keysFromCache =
    Object.keys(indexData)
      .filter(key => understoodKeys.includes(key))
      .filter(key => !keysNeedingFetch.includes(key));

  const cacheArrayBufferPromises =
    keysFromCache
      .map(key => idbIndexData[key])
      .map(({cachedBinarySource}) =>
        cachedBinarySource.arrayBuffer());

  const fetchPromises =
    fetchIndexes(keysNeedingFetch);

  const fetchBlobPromises =
    fetchPromises
      .map(promise => promise
        .then(response => response.blob()));

  const fetchArrayBufferPromises =
    fetchBlobPromises
      .map(promise => promise
        .then(blob => blob.arrayBuffer()));

  function arrayBufferToJSON(data) {
    data = new Uint8Array(data);
    data = unpack(data);
    data = decompress(data);
    return data;
  }

  function importIndexes(keys, jsons) {
    const succeeded = [];
    const failed = [];

    stitchArrays({key: keys, json: jsons})
      .forEach(({key, json}) => {
        try {
          importIndex(key, json);
          succeeded.push([key, null]);
        } catch (caughtError) {
          failed.push([key, caughtError]);
        }
      });

    return {succeeded, failed};
  }

  if (idb) {
    console.debug(`Reusing indexes from search cache:`, keysFromCache);
    console.debug(`Fetching indexes anew:`, keysNeedingFetch);
  }

  let signalRetryNeeded = false;

  await Promise.all([
    async () => {
      const cacheArrayBuffers =
        await Promise.all(cacheArrayBufferPromises);

      const cacheJSONs =
        cacheArrayBuffers
          .map(arrayBufferToJSON);

      const importResults =
        importIndexes(keysFromCache, cacheJSONs);

      if (empty(importResults.failed)) return;
      if (!idb) return;

      const transaction =
        idb.transaction(['indexes'], 'readwrite');

      const store =
        transaction.objectStore('indexes');

      for (const [key, error] of importResults.failed) {
        console.warn(`Failed to import search index from cache: ${key}`);
        console.warn(error);
      }

      for (const [key] of importResults.failed) {
        try {
          await promisifyIDBRequest(store.delete(key));
        } catch (error) {
          console.warn(`Error deleting ${key} from internal search cache`);
          console.warn(error);
          continue;
        }
      }

      signalRetryNeeded = true;
    },

    async () => {
      const fetchArrayBuffers =
        await Promise.all(fetchArrayBufferPromises);

      const fetchJSONs =
        fetchArrayBuffers
          .map(arrayBufferToJSON);

      const importResults =
        importIndexes(keysNeedingFetch, fetchJSONs);

      if (empty(importResults.failed)) return;

      for (const [key, error] of importResults.failed) {
        console.warn(`Failed to import search index from fetch: ${key}`);
        console.warn(error);
      }

      console.warn(
        `Trying again would just mean fetching this same data, ` +
        `so this is needs outside intervention.`);

      throw new Error(`Failed to load search data from fresh fetch`);
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

  if (signalRetryNeeded) {
    if (fromRetry) {
      console.error(`Already retried, this is probably a logic / code flow error.`);
      throw new Error(`Failed to load good search data even on a retry`);
    } else {
      console.warn(`Trying to load search data again, hopefully from fresh conditions`);
      return main(true);
    }
  }
}

function importIndex(indexKey, indexData) {
  for (const [key, value] of Object.entries(indexData)) {
    indexes[indexKey].import(key, JSON.stringify(value));
  }
}

function handleRuntimeError() {
  postStatus('runtime-error');
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
  postMessage({
    kind: 'status',
    status: newStatus,
  });
}

function postActionResult(id, status, value) {
  postMessage({
    kind: 'result',
    id,
    status,
    value,
  });
}

function performSearchAction({query, options}) {
  const {queriedKind} = processTerms(query);
  const genericResults = queryGenericIndex(query, options);
  const verbatimResults = queryVerbatimIndex(query, options);

  const verbatimIDs =
    new Set(verbatimResults?.map(result => result.id));

  const commonResults =
    (verbatimResults && genericResults
      ? genericResults
          .filter(({id}) => verbatimIDs.has(id))
      : verbatimResults ?? genericResults);

  return {
    results: commonResults,
    queriedKind,
  };
}

const interestingFieldCombinations = [
  ['primaryName'],
  ['additionalNames'],

  ['primaryName', 'parentName', 'groups'],
  ['primaryName', 'parentName'],
  ['primaryName', 'groups', 'contributors'],
  ['primaryName', 'groups', 'artTags'],
  ['primaryName', 'groups'],
  ['additionalNames', 'groups'],
  ['primaryName', 'contributors'],
  ['primaryName', 'artTags'],
  ['parentName', 'groups', 'artTags'],
  ['parentName', 'artTags'],
  ['groups', 'contributors'],
  ['groups', 'artTags'],

  // This prevents just matching *everything* tagged "john" if you
  // only search "john", but it actually supports matching more than
  // *two* tags at once: "john rose lowas" works! This is thanks to
  // flexsearch matching multiple field values in a single query.
  ['artTags', 'artTags'],

  ['contributors', 'parentName'],
  ['contributors', 'groups'],
  ['primaryName', 'contributors'],
];

function queryGenericIndex(query, options) {
  return queryIndex({
    indexKey: 'generic',
    termsKey: 'genericTerms',
  }, query, options);
}

function queryVerbatimIndex(query, options) {
  return queryIndex({
    indexKey: 'verbatim',
    termsKey: 'verbatimTerms',
  }, query, options);
}

function queryIndex({termsKey, indexKey}, query, options) {
  const interestingFields =
    unique(interestingFieldCombinations.flat());

  const {[termsKey]: terms, queriedKind} =
    processTerms(query);

  if (empty(terms)) return null;

  const particles =
    particulate(terms);

  const groupedParticles =
    groupArray(particles, ({length}) => length);

  const queriesBy = keys =>
    (groupedParticles.get(keys.length) ?? [])
      .flatMap(particles => Array.from(permutations(particles)))
      .map(values => values.map(({terms}) => terms.join(' ')))
      .map(values =>
        stitchArrays({
          field: keys,
          query: values,
        }));

  const boilerplate = queryBoilerplate(indexes[indexKey]);

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

  let matchedResults = new Set();

  for (const interestingFieldCombination of interestingFieldCombinations) {
    for (const query of queriesBy(interestingFieldCombination)) {
      const [firstQueryFieldLine, ...restQueryFieldLines] = query;

      const commonAcrossFields =
        new Set(
          particleResults
            [firstQueryFieldLine.field]
            [firstQueryFieldLine.query]);

      for (const currQueryFieldLine of restQueryFieldLines) {
        const tossResults = new Set(commonAcrossFields);

        const keepResults =
          particleResults
            [currQueryFieldLine.field]
            [currQueryFieldLine.query];

        for (const result of keepResults) {
          tossResults.delete(result);
        }

        for (const result of tossResults) {
          commonAcrossFields.delete(result);
        }
      }

      for (const result of commonAcrossFields) {
        matchedResults.add(result);
      }
    }
  }

  matchedResults = Array.from(matchedResults);

  const filteredResults =
    (queriedKind
      ? matchedResults.filter(id => id.split(':')[0] === queriedKind)
      : matchedResults);

  const constitutedResults =
    boilerplate.constitute(filteredResults);

  return constitutedResults;
}

function processTerms(query) {
  const kindTermSpec = [
    {kind: 'album', terms: ['album', 'albums', 'release', 'releases']},
    {kind: 'artist', terms: ['artist', 'artists']},
    {kind: 'flash', terms: ['flash', 'flashes']},
    {kind: 'group', terms: ['group', 'groups']},
    {kind: 'tag', terms: ['art tag', 'art tags', 'tag', 'tags']},
    {kind: 'track', terms: ['track', 'tracks']},
  ];

  const genericTerms = [];
  const verbatimTerms = [];
  let queriedKind = null;

  const termRegexp =
    new RegExp(
      String.raw`(?<kind>(?<=^|\s)(?:${kindTermSpec.flatMap(spec => spec.terms).join('|')})(?=$|\s))` +
      String.raw`|(?<=^|\s)(?<quote>["'])(?<regularVerbatim>.+?)\k<quote>(?=$|\s)` +
      String.raw`|(?<=^|\s)[“”‘’](?<curlyVerbatim>.+?)[“”‘’](?=$|\s)` +
      String.raw`|[^\s\-]+`,
      'gi');

  for (const match of query.matchAll(termRegexp)) {
    const {groups} = match;

    if (groups.kind && !queriedKind) {
      queriedKind =
        kindTermSpec
          .find(({terms}) => terms.includes(groups.kind.toLowerCase()))
          .kind;

      continue;
    }

    const verbatim = groups.regularVerbatim || groups.curlyVerbatim;
    if (verbatim) {
      verbatimTerms.push(verbatim);
      continue;
    }

    genericTerms.push(match[0]);
  }

  return {genericTerms, verbatimTerms, queriedKind};
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
