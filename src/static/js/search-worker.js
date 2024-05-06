import {makeSearchIndex, searchSpec} from '../shared-util/search-spec.js';
import {empty, groupArray, stitchArrays, unique, withEntries}
  from '../shared-util/sugar.js';

import FlexSearch from '../lib/flexsearch/flexsearch.bundle.module.min.js';

let status = null;
let indexes = null;
let searchData = null;

onmessage = handleWindowMessage;
postStatus('alive');

main().then(
  () => {
    postStatus('ready');
  },
  error => {
    console.error(`Search worker setup error:`, error);
    postStatus('setup-error');
  });

async function main() {
  indexes =
    withEntries(searchSpec, entries => entries
      .map(([key, descriptor]) => [
        key,
        makeSearchIndex(descriptor, {FlexSearch}),
      ]));

  searchData =
    await fetch('/search-data/index.json')
      .then(resp => resp.json());

  // If this fails, it's because an outdated index was cached.
  // TODO: If this fails, try again once with a cache busting url.
  for (const [indexName, indexData] of Object.entries(searchData)) {
    for (const [key, value] of Object.entries(indexData)) {
      indexes[indexName].import(key, value);
    }
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
  const terms = query.split(' ');

  const particles = particulate(terms);

  const groupedParticles =
    groupArray(particles, ({length}) => length);

  const queriesBy = keys =>
    groupedParticles
      .get(keys.length)
      .flatMap(permutations)
      .map(values => values.map(({terms}) => terms.join(' ')))
      .map(values => Object.fromEntries(stitchArrays([keys, values])));

  console.log(
    queriesBy(['primaryName'])
      .map(l => JSON.stringify(l))
      .join('\n'));

  console.log(
    queriesBy(['primaryName', 'contributors'])
      .map(l => JSON.stringify(l))
      .join('\n'));

  const boilerplate = queryBoilerplate(index);

  const {fieldResults} = boilerplate.query(query, options);

  const {primaryName} = fieldResults;

  return boilerplate.constitute(primaryName);
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

function queryBoilerplate(index, query, options) {
  const idToDoc = {};

  return {
    idToDoc,

    constitute: (ids) =>
      ids.map(id => ({id, doc: idToDoc[id]})),

    query: (query, options) => {
      const rawResults =
        index.search(query, options);

      const fieldResults =
        Object.fromEntries(
          rawResults
            .map(({field, result}) => [
              field,
              result.map(({id}) => id),
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
