import {makeSearchIndexes} from '../shared-util/searchSchema.js';
import {withEntries} from '../shared-util/sugar.js';

import FlexSearch from '../lib/flexsearch/flexsearch.bundle.module.min.js';

let status = null;
let indexes = null;
let searchData = null;

onmessage = handleWindowMessage;
postStatus('alive');

main().then(
  () => {
    postStatus('ready');
  });

async function main() {
  indexes =
    makeSearchIndexes(FlexSearch);

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
      value = await performSearch(message.data.options);
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

function performSearch({query, options}) {
  return (
    withEntries(indexes, entries => entries
      .map(([indexName, index]) => [
        indexName,
        index.search(query, options),
      ])));
}
