/* eslint-env browser */

import {promiseWithResolvers} from '../../shared-util/sugar.js';

import {dispatchInternalEvent} from '../client-util.js';

export const info = {
  id: 'wikiSearchInfo',

  state: {
    worker: null,

    workerReadyPromise: null,
    workerReadyPromiseResolvers: null,

    workerActionCounter: 0,
    workerActionPromiseResolverMap: new Map(),

    downloads: Object.create(null),
  },

  event: {
    whenWorkerAlive: [],
    whenWorkerReady: [],
    whenWorkerFailsToInitialize: [],
    whenWorkerHasRuntimeError: [],

    whenDownloadBegins: [],
    whenDownloadsBegin: [],
    whenDownloadProgresses: [],
    whenDownloadEnds: [],
  },
};

export async function initializeSearchWorker() {
  const {state} = info;

  if (state.worker) {
    return await state.workerReadyPromise;
  }

  state.worker =
    new Worker(
      import.meta.resolve('../search-worker.js'),
      {type: 'module'});

  state.worker.onmessage = handleSearchWorkerMessage;

  const {promise, resolve, reject} = promiseWithResolvers();

  state.workerReadyPromiseResolvers = {resolve, reject};

  return await (state.workerReadyPromise = promise);
}

function handleSearchWorkerMessage(message) {
  switch (message.data.kind) {
    case 'status':
      handleSearchWorkerStatusMessage(message);
      break;

    case 'result':
      handleSearchWorkerResultMessage(message);
      break;

    case 'download-begun':
      handleSearchWorkerDownloadBegunMessage(message);
      break;

    case 'download-progress':
      handleSearchWorkerDownloadProgressMessage(message);
      break;

    case 'download-complete':
      handleSearchWorkerDownloadCompleteMessage(message);
      break;

    default:
      console.warn(`Unknown message kind "${message.data.kind}" <- from search worker`);
      break;
  }
}

function handleSearchWorkerStatusMessage(message) {
  const {state, event} = info;

  switch (message.data.status) {
    case 'alive':
      console.debug(`Search worker is alive, but not yet ready.`);
      dispatchInternalEvent(event, 'whenWorkerAlive');
      break;

    case 'ready':
      console.debug(`Search worker has loaded corpuses and is ready.`);
      state.workerReadyPromiseResolvers.resolve(state.worker);
      dispatchInternalEvent(event, 'whenWorkerReady');
      break;

    case 'setup-error':
      console.debug(`Search worker failed to initialize.`);
      state.workerReadyPromiseResolvers.reject(new Error('Received "setup-error" status from worker'));
      dispatchInternalEvent(event, 'whenWorkerFailsToInitialize');
      break;

    case 'runtime-error':
      console.debug(`Search worker had an uncaught runtime error.`);
      dispatchInternalEvent(event, 'whenWorkerHasRuntimeError');
      break;

    default:
      console.warn(`Unknown status "${message.data.status}" <- from search worker`);
      break;
  }
}

function handleSearchWorkerResultMessage(message) {
  const {state} = info;
  const {id} = message.data;

  if (!id) {
    console.warn(`Result without id <- from search worker:`, message.data);
    return;
  }

  if (!state.workerActionPromiseResolverMap.has(id)) {
    console.warn(`Runaway result id <- from search worker:`, message.data);
    return;
  }

  const {resolve, reject} =
    state.workerActionPromiseResolverMap.get(id);

  switch (message.data.status) {
    case 'resolve':
      resolve(message.data.value);
      break;

    case 'reject':
      reject(message.data.value);
      break;

    default:
      console.warn(`Unknown result status "${message.data.status}" <- from search worker`);
      return;
  }

  state.workerActionPromiseResolverMap.delete(id);
}

function handleSearchWorkerDownloadBegunMessage(message) {
  const {event} = info;
  const {context: contextKey, keys} = message.data;

  const context = getSearchWorkerDownloadContext(contextKey, true);

  for (const key of keys) {
    context[key] = 0.00;

    dispatchInternalEvent(event, 'whenDownloadBegins', {
      context: contextKey,
      key,
    });
  }

  dispatchInternalEvent(event, 'whenDownloadsBegin', {
    context: contextKey,
    keys,
  });
}

function handleSearchWorkerDownloadProgressMessage(message) {
  const {event} = info;
  const {context: contextKey, key, progress} = message.data;

  const context = getSearchWorkerDownloadContext(contextKey);

  context[key] = progress;

  dispatchInternalEvent(event, 'whenDownloadProgresses', {
    context: contextKey,
    key,
    progress,
  });
}

function handleSearchWorkerDownloadCompleteMessage(message) {
  const {event} = info;
  const {context: contextKey, key} = message.data;

  const context = getSearchWorkerDownloadContext(contextKey);

  context[key] = 1.00;

  dispatchInternalEvent(event, 'whenDownloadEnds', {
    context: contextKey,
    key,
  });
}

export function getSearchWorkerDownloadContext(context, initialize = false) {
  const {state} = info;

  if (context in state.downloads) {
    return state.downloads[context];
  }

  if (!initialize) {
    return null;
  }

  return state.downloads[context] = Object.create(null);
}

export async function postSearchWorkerAction(action, options) {
  const {state} = info;

  const worker = await initializeSearchWorker();
  const id = ++state.workerActionCounter;

  const {promise, resolve, reject} = promiseWithResolvers();

  state.workerActionPromiseResolverMap.set(id, {resolve, reject});

  worker.postMessage({
    kind: 'action',
    action: action,
    id,
    options,
  });

  return await promise;
}

export async function searchAll(query, options = {}) {
  return await postSearchWorkerAction('search', {
    query,
    options,
  });
}
