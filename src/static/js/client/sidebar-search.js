import {getColors} from '../../shared-util/colors.js';

import {
  accumulateSum,
  compareArrays,
  empty,
  unique,
} from '../../shared-util/sugar.js';

import {
  cssProp,
  decodeEntities,
  openAlbum,
  openArtist,
  openArtTag,
  openFlash,
  openGroup,
  openTrack,
  rebase,
  templateContent,
} from '../client-util.js';

import {getLatestDraggedLink} from './dragged-link.js';

import {
  info as wikiSearchInfo,
  getSearchWorkerDownloadContext,
  searchAll,
} from './wiki-search.js';

export const info = {
  id: 'sidebarSearchInfo',

  pageContainer: null,

  searchSidebarColumn: null,
  searchBox: null,
  searchLabel: null,
  searchInput: null,

  contextContainer: null,
  contextBackLink: null,

  progressRule: null,
  progressContainer: null,
  progressLabel: null,
  progressBar: null,

  failedRule: null,
  failedContainer: null,

  filterContainer: null,
  albumFilterLink: null,
  artistFilterLink: null,
  flashFilterLink: null,
  groupFilterLink: null,
  tagFilterLink: null,
  trackFilterLink: null,

  resultsRule: null,
  resultsContainer: null,
  results: null,

  endSearchRule: null,
  endSearchLine: null,
  endSearchLink: null,

  standbyInputPlaceholder: null,

  preparingString: null,
  loadingDataString: null,
  searchingString: null,
  failedString: null,

  noResultsString: null,
  currentResultString: null,
  endSearchString: null,

  backString: null,

  albumResultKindString: null,
  artistResultKindString: null,
  flashResultKindString: null,
  groupResultKindString: null,
  singleResultKindString: null,
  tagResultKindString: null,

  groupResultDisambiguatorString: null,
  flashResultDisambiguatorString: null,
  trackResultDisambiguatorString1: null,
  trackResultDisambiguatorString2: null,

  albumResultFilterString: null,
  artistResultFilterString: null,
  flashResultFilterString: null,
  groupResultFilterString: null,
  tagResultFilterString: null,
  trackResultFilterString: null,

  state: {
    sidebarColumnShownForSearch: null,

    tidiedSidebar: null,
    collapsedDetailsForTidiness: null,

    recallingRecentSearch: null,
    recallingRecentSearchFromMouse: null,

    justPerformedActiveQuery: false,

    currentValue: null,

    workerStatus: null,
    searchStage: null,

    stoppedTypingTimeout: null,
    stoppedScrollingTimeout: null,
    focusFirstResultTimeout: null,
    dismissChangeEventTimeout: null,

    indexDownloadStatuses: Object.create(null),
  },

  session: {
    activeQuery: {
      type: 'string',
    },

    activeQueryContextPageName: {type: 'string'},
    activeQueryContextPagePathname: {type: 'string'},
    activeQueryContextPageColor: {type: 'string'},
    zapActiveQueryContext: {type: 'boolean'},

    activeQueryResults: {
      type: 'json',
      maxLength: settings => settings.maxActiveResultsStorage,
    },

    activeFilterType: {
      type: 'string',
    },

    repeatQueryOnReload: {
      type: 'boolean',
      default: false,
    },

    resultsScrollOffset: {
      type: 'number',
    },
  },

  settings: {
    stoppedTypingDelay: 800,
    stoppedScrollingDelay: 200,

    pressDownToFocusFirstResultLatency: 500,
    dismissChangeEventAfterFocusingFirstResultLatency: 50,

    maxActiveResultsStorage: 100000,
  },
};

export function* bindSessionStorage() {
  if (yield 'activeQuery') {
    yield 'activeQueryContextPageName';
    yield 'activeQueryContextPagePathname';
    yield 'activeQueryContextPageColor';
    yield 'zapActiveQueryContext';

    yield 'activeQueryResults';
    yield 'activeFilterType';
    yield 'resultsScrollOffset';
  }
}

export function getPageReferences() {
  info.pageContainer =
    document.getElementById('page-container');

  info.searchBox =
    document.querySelector('.wiki-search-sidebar-box');

  if (!info.searchBox) {
    return;
  }

  info.searchLabel =
    info.searchBox.querySelector('.wiki-search-label');

  info.searchInput =
    info.searchBox.querySelector('.wiki-search-input');

  info.searchSidebarColumn =
    info.searchBox.closest('.sidebar-column');

  info.standbyInputPlaceholder =
    info.searchInput.placeholder;

  const findString = classPart =>
    info.searchBox.querySelector(`.wiki-search-${classPart}-string`);

  info.preparingString =
    findString('preparing');

  info.loadingDataString =
    findString('loading-data');

  info.searchingString =
    findString('searching');

  info.failedString =
    findString('failed');

  info.noResultsString =
    findString('no-results');

  info.backString =
    findString('back');

  info.currentResultString =
    findString('current-result');

  info.endSearchString =
    findString('end-search');

  info.albumResultKindString =
    findString('album-result-kind');

  info.artistResultKindString =
    findString('artist-result-kind');

  info.flashResultKindString =
    findString('flash-result-kind');

  info.groupResultKindString =
    findString('group-result-kind');

  info.singleResultKindString =
    findString('single-result-kind');

  info.tagResultKindString =
    findString('tag-result-kind');

  info.groupResultDisambiguatorString =
    findString('group-result-disambiguator');

  info.flashResultDisambiguatorString =
    findString('flash-result-disambiguator');

  info.trackResultDisambiguatorString1 =
    findString('track-result-album-disambiguator');

  info.trackResultDisambiguatorString2 =
    findString('track-result-artist-disambiguator');

  info.albumResultFilterString =
    findString('album-result-filter');

  info.artistResultFilterString =
    findString('artist-result-filter');

  info.flashResultFilterString =
    findString('flash-result-filter');

  info.groupResultFilterString =
    findString('group-result-filter');

  info.tagResultFilterString =
    findString('tag-result-filter');

  info.trackResultFilterString =
    findString('track-result-filter');
}

export function addInternalListeners() {
  if (!info.searchBox) return;

  wikiSearchInfo.event.whenWorkerAlive.push(
    trackSidebarSearchWorkerAlive,
    updateSidebarSearchStatus);

  wikiSearchInfo.event.whenWorkerReady.push(
    trackSidebarSearchWorkerReady,
    updateSidebarSearchStatus);

  wikiSearchInfo.event.whenWorkerFailsToInitialize.push(
    trackSidebarSearchWorkerFailsToInitialize,
    updateSidebarSearchStatus);

  wikiSearchInfo.event.whenWorkerHasRuntimeError.push(
    trackSidebarSearchWorkerHasRuntimeError,
    updateSidebarSearchStatus);

  wikiSearchInfo.event.whenDownloadsBegin.push(
    trackSidebarSearchDownloadsBegin,
    updateSidebarSearchStatus);

  wikiSearchInfo.event.whenDownloadProgresses.push(
    updateSidebarSearchStatus);

  wikiSearchInfo.event.whenDownloadEnds.push(
    trackSidebarSearchDownloadEnds,
    updateSidebarSearchStatus);
}

export function mutatePageContent() {
  if (!info.searchBox) return;

  // Context section

  info.contextContainer =
    document.createElement('div');

  info.contextContainer.classList.add('wiki-search-context-container');

  info.contextBackLink =
    document.createElement('a');

  info.contextContainer.appendChild(
    templateContent(info.backString, {
      page: info.contextBackLink,
    }));

  cssProp(info.contextContainer, 'display', 'none');

  info.searchBox.appendChild(info.contextContainer);

  // Progress section

  info.progressRule =
    document.createElement('hr');

  info.progressContainer =
    document.createElement('div');

  info.progressContainer.classList.add('wiki-search-progress-container');

  cssProp(info.progressRule, 'display', 'none');
  cssProp(info.progressContainer, 'display', 'none');

  info.progressLabel =
    document.createElement('label');

  info.progressLabel.classList.add('wiki-search-progress-label');
  info.progressLabel.htmlFor = 'wiki-search-progress-bar';

  info.progressBar =
    document.createElement('progress');

  info.progressBar.classList.add('wiki-search-progress-bar');
  info.progressBar.id = 'wiki-search-progress-bar';

  info.progressContainer.appendChild(info.progressLabel);
  info.progressContainer.appendChild(info.progressBar);

  info.searchBox.appendChild(info.progressRule);
  info.searchBox.appendChild(info.progressContainer);

  // Search failed section

  info.failedRule =
    document.createElement('hr');

  info.failedContainer =
    document.createElement('div');

  info.failedContainer.classList.add('wiki-search-failed-container');

  {
    const p = document.createElement('p');
    p.appendChild(templateContent(info.failedString));
    info.failedContainer.appendChild(p);
  }

  cssProp(info.failedRule, 'display', 'none');
  cssProp(info.failedContainer, 'display', 'none');

  info.searchBox.appendChild(info.failedRule);
  info.searchBox.appendChild(info.failedContainer);

  // Filter section

  info.filterContainer =
    document.createElement('div');

  info.filterContainer.classList.add('wiki-search-filter-container');

  cssProp(info.filterContainer, 'display', 'none');

  forEachFilter((type, _filterLink) => {
    // TODO: It's probably a sin to access `session` during this step LOL
    const {session} = info;

    const filterLink = document.createElement('a');

    filterLink.href = '#';
    filterLink.classList.add('wiki-search-filter-link');

    if (session.activeFilterType === type) {
      filterLink.classList.add('active');
    }

    const string = info[type + 'ResultFilterString'];
    filterLink.appendChild(templateContent(string));

    info[type + 'FilterLink'] = filterLink;

    info.filterContainer.appendChild(filterLink);
  });

  info.searchBox.appendChild(info.filterContainer);

  // Results section

  info.resultsRule =
    document.createElement('hr');

  info.resultsContainer =
    document.createElement('div');

  info.resultsContainer.classList.add('wiki-search-results-container');

  cssProp(info.resultsRule, 'display', 'none');
  cssProp(info.resultsContainer, 'display', 'none');

  info.results =
    document.createElement('div');

  info.results.classList.add('wiki-search-results');

  info.resultsContainer.appendChild(info.results);

  info.searchBox.appendChild(info.resultsRule);
  info.searchBox.appendChild(info.resultsContainer);

  // End search section

  info.endSearchRule =
    document.createElement('hr');

  info.endSearchLine =
    document.createElement('p');

  info.endSearchLink =
    document.createElement('a');

  {
    const p = info.endSearchLine;
    const a = info.endSearchLink;
    p.classList.add('wiki-search-end-search-line');
    a.setAttribute('href', '#');
    a.appendChild(templateContent(info.endSearchString));
    p.appendChild(a);
  }

  cssProp(info.endSearchRule, 'display', 'none');
  cssProp(info.endSearchLine, 'display', 'none');

  info.searchBox.appendChild(info.endSearchRule);
  info.searchBox.appendChild(info.endSearchLine);

  // Accommodate the web browser reconstructing the search input with a value
  // that was previously entered (or restored after recall), i.e. because
  // the user is traversing very far back in history and yet the browser is
  // trying to rebuild the page as-was anyway, by telling it "no don't".
  info.searchInput.value = '';
}

export function addPageListeners() {
  if (!info.searchInput) return;

  info.searchInput.addEventListener('mousedown', _domEvent => {
    const {state} = info;

    if (state.recallingRecentSearch) {
      state.recallingRecentSearchFromMouse = true;
    }
  });

  info.searchInput.addEventListener('focus', _domEvent => {
    const {session, state} = info;

    if (state.recallingRecentSearch) {
      info.searchInput.value = session.activeQuery;
      info.searchInput.placeholder = info.standbyInputPlaceholder;
      showSidebarSearchResults(session.activeQueryResults);
      state.recallingRecentSearch = false;
    }
  });

  info.searchLabel.addEventListener('click', domEvent => {
    const {state} = info;

    if (state.recallingRecentSearchFromMouse) {
      if (info.searchInput.selectionStart === info.searchInput.selectionEnd) {
        info.searchInput.select();
      }

      state.recallingRecentSearchFromMouse = false;
      return;
    }

    const inputRect = info.searchInput.getBoundingClientRect();
    if (domEvent.clientX < inputRect.left - 3) {
      info.searchInput.select();
    }
  });

  info.searchInput.addEventListener('change', _domEvent => {
    const {state} = info;

    if (state.dismissChangeEventTimeout) {
      state.dismissChangeEventTimeout = null;
      clearTimeout(state.dismissChangeEventTimeout);
      return;
    }

    activateSidebarSearch(info.searchInput.value);
  });

  info.searchInput.addEventListener('input', _domEvent => {
    const {settings, state} = info;

    if (!info.searchInput.value) {
      clearSidebarSearch(); // ...but don't clear filter
      return;
    }

    if (state.stoppedTypingTimeout) {
      clearTimeout(state.stoppedTypingTimeout);
    }

    state.stoppedTypingTimeout =
      setTimeout(() => {
        state.stoppedTypingTimeout = null;
        activateSidebarSearch(info.searchInput.value);
      }, settings.stoppedTypingDelay);

    if (state.focusFirstResultTimeout) {
      clearTimeout(state.focusFirstResultTimeout);
      state.focusFirstResultTimeout = null;
    }
  });

  info.searchInput.addEventListener('drop', handleDroppedIntoSearchInput);

  info.searchInput.addEventListener('keydown', domEvent => {
    const {settings, state} = info;

    if (domEvent.key === 'ArrowUp' || domEvent.key === 'ArrowDown') {
      domEvent.preventDefault();
    }

    if (domEvent.key === 'ArrowDown') {
      if (state.stoppedTypingTimeout) {
        clearTimeout(state.stoppedTypingTimeout);
        state.stoppedTypingTimeout = null;

        if (state.focusFirstResultTimeout) {
          clearTimeout(state.focusFirstResultTimeout);
        }

        state.focusFirstResultTimeout =
          setTimeout(() => {
            state.focusFirstResultTimeout = null;
          }, settings.pressDownToFocusFirstResultLatency);

        activateSidebarSearch(info.searchInput.value);
      } else {
        focusFirstSidebarSearchResult();
      }
    }
  });

  document.addEventListener('selectionchange', _domEvent => {
    const {state} = info;

    if (state.focusFirstResultTimeout) {
      clearTimeout(state.focusFirstResultTimeout);
      state.focusFirstResultTimeout = null;
    }
  });

  info.endSearchLink.addEventListener('click', domEvent => {
    domEvent.preventDefault();
    clearSidebarSearch();
    clearSidebarFilter();
    possiblyHideSearchSidebarColumn();
  });

  forEachFilter((type, filterLink) => {
    filterLink.addEventListener('click', domEvent => {
      domEvent.preventDefault();
      toggleSidebarSearchFilter(type);
    });
  });

  info.resultsContainer.addEventListener('scroll', () => {
    const {settings, state} = info;

    if (state.stoppedScrollingTimeout) {
      clearTimeout(state.stoppedScrollingTimeout);
    }

    state.stoppedScrollingTimeout =
      setTimeout(() => {
        saveSidebarSearchResultsScrollOffset();
      }, settings.stoppedScrollingDelay);
  });

  document.addEventListener('keypress', domEvent => {
    const {tagName} = document.activeElement ?? {};
    if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
      return;
    }

    if (domEvent.shiftKey && domEvent.code === 'Slash') {
      domEvent.preventDefault();
      info.searchLabel.click();
    }
  });
}

export function initializeState() {
  const {session} = info;

  if (!info.searchInput) return;

  if (session.activeQuery) {
    if (session.repeatQueryOnReload) {
      info.searchInput.value = session.activeQuery;
      activateSidebarSearch(session.activeQuery);
    } else if (session.activeQueryResults) {
      considerRecallingRecentSidebarSearch();
    }
  }
}

function trackSidebarSearchWorkerAlive() {
  const {state} = info;

  state.workerStatus = 'alive';
}

function trackSidebarSearchWorkerReady() {
  const {state} = info;

  state.workerStatus = 'ready';
  state.searchStage = 'searching';
}

function trackSidebarSearchWorkerFailsToInitialize() {
  const {state} = info;

  state.workerStatus = 'failed';
  state.searchStage = 'failed';
}

function trackSidebarSearchWorkerHasRuntimeError() {
  const {state} = info;

  state.workerStatus = 'failed';
  state.searchStage = 'failed';
}

function trackSidebarSearchDownloadsBegin(event) {
  const {state} = info;

  if (event.context === 'search-indexes') {
    for (const key of event.keys) {
      state.indexDownloadStatuses[key] = 'active';
    }
  }
}

function trackSidebarSearchDownloadEnds(event) {
  const {state} = info;

  if (event.context === 'search-indexes') {
    state.indexDownloadStatuses[event.key] = 'complete';

    const statuses = Object.values(state.indexDownloadStatuses);
    if (statuses.every(status => status === 'complete')) {
      for (const key of Object.keys(state.indexDownloadStatuses)) {
        delete state.indexDownloadStatuses[key];
      }
    }
  }
}

function forEachFilter(callback) {
  const filterOrder = [
    'track',
    'album',
    'artist',
    'group',
    'flash',
    'tag',
  ];

  for (const type of filterOrder) {
    callback(type, info[type + 'FilterLink']);
  }
}

async function activateSidebarSearch(query) {
  const {session, state} = info;

  if (!query) {
    return;
  }

  if (state.stoppedTypingTimeout) {
    clearTimeout(state.stoppedTypingTimeout);
    state.stoppedTypingTimeout = null;
  }

  state.searchStage =
    (state.workerStatus === 'ready'
      ? 'searching'
      : 'preparing');
  updateSidebarSearchStatus();

  let results;
  try {
    results = await searchAll(query, {enrich: true});
  } catch (error) {
    console.error(`There was an error performing a sidebar search:`);
    console.error(error);
    showSidebarSearchFailed();
    return;
  }

  state.justPerformedActiveQuery = true;
  state.searchStage = 'complete';
  updateSidebarSearchStatus();

  recordActiveQueryContext();

  session.activeQuery = query;
  session.activeQueryResults = results;
  session.resultsScrollOffset = 0;

  showSidebarSearchResults(results);

  if (state.focusFirstResultTimeout) {
    clearTimeout(state.focusFirstResultTimeout);
    state.focusFirstResultTimeout = null;
    focusFirstSidebarSearchResult();
  }
}

function recordActiveQueryContext() {
  const {session} = info;

  if (document.documentElement.dataset.urlKey === 'localized.home') {
    session.activeQueryContextPageName = null;
    session.activeQueryContextPagePathname = null;
    session.activeQueryContextPageColor = null;
    session.zapActiveQueryContext = true;
    return;
  }

  // Zapping means subsequent searches don't record context.
  if (session.zapActiveQueryContext) {
    return;
  }

  // We also don't overwrite existing context.
  if (session.activeQueryContextPagePathname) {
    return;
  }

  session.activeQueryContextPageName =
    decodeEntities(document.querySelector('title').dataset.withoutWikiName) ||
    document.title;

  session.activeQueryContextPagePathname =
    location.pathname;

  session.activeQueryContextPageColor =
    document.querySelector('.color-style')?.dataset.color ??
    null;
}

function clearSidebarSearch() {
  const {state} = info;

  if (state.stoppedTypingTimeout) {
    clearTimeout(state.stoppedTypingTimeout);
    state.stoppedTypingTimeout = null;
  }

  info.searchBox.classList.remove('showing-results');
  info.searchSidebarColumn.classList.remove('search-showing-results');

  info.searchInput.value = '';

  state.searchStage = null;
  state.justPerformedActiveQuery = false;

  clearActiveQuery();

  hideSidebarSearchResults();
}

function clearActiveQuery() {
  const {session} = info;

  session.activeQuery = null;
  session.activeQueryResults = null;
  session.resultsScrollOffset = null;

  session.activeQueryContextPageName = null;
  session.activeQueryContextPagePathname = null;
  session.activeQueryContextPageColor = null;
  session.zapActiveQueryContext = false;
}

function clearSidebarFilter() {
  const {session} = info;

  toggleSidebarSearchFilter(session.activeFilterType);

  forEachFilter((_type, filterLink) => {
    filterLink.classList.remove('shown', 'hidden');
  });
}

function updateSidebarSearchStatus() {
  const {state} = info;

  if (state.searchStage === 'failed') {
    hideSidebarSearchResults();
    showSidebarSearchFailed();

    return;
  }

  const searchIndexDownloads =
    getSearchWorkerDownloadContext('search-indexes');

  const downloadProgressValues =
    Object.values(searchIndexDownloads ?? {});

  if (downloadProgressValues.some(v => v < 1.00)) {
    const total = Object.keys(state.indexDownloadStatuses).length;
    const sum = accumulateSum(downloadProgressValues);
    showSidebarSearchProgress(
      sum / total,
      templateContent(info.loadingDataString));

    return;
  }

  if (state.searchStage === 'preparing') {
    showSidebarSearchProgress(
      null,
      templateContent(info.preparingString));

    return;
  }

  if (state.searchStage === 'searching') {
    showSidebarSearchProgress(
      null,
      templateContent(info.searchingString));

    return;
  }

  hideSidebarSearchProgress();
}

function showSidebarSearchProgress(progress, label) {
  cssProp(info.progressRule, 'display', null);
  cssProp(info.progressContainer, 'display', null);

  if (progress === null) {
    info.progressBar.removeAttribute('value');
  } else {
    info.progressBar.value = progress;
  }

  while (info.progressLabel.firstChild) {
    info.progressLabel.firstChild.remove();
  }

  info.progressLabel.appendChild(label);
}

function hideSidebarSearchProgress() {
  cssProp(info.progressRule, 'display', 'none');
  cssProp(info.progressContainer, 'display', 'none');
}

function showSidebarSearchFailed() {
  const {state} = info;

  hideSidebarSearchProgress();
  hideSidebarSearchResults();

  cssProp(info.failedRule, 'display', null);
  cssProp(info.failedContainer, 'display', null);

  info.searchLabel.classList.add('disabled');
  info.searchInput.disabled = true;

  if (state.stoppedTypingTimeout) {
    clearTimeout(state.stoppedTypingTimeout);
    state.stoppedTypingTimeout = null;
  }
}

function showSidebarSearchResults(results) {
  const {session} = info;

  console.debug(`Showing search results:`, tidyResults(results));

  showSearchSidebarColumn();

  info.searchBox.classList.add('showing-results');
  info.searchSidebarColumn.classList.add('search-showing-results');

  let filterType = session.activeFilterType;
  let shownAnyResults =
    fillResultElements(results, {filterType: session.activeFilterType});

  showFilterElements(results);

  if (!shownAnyResults) {
    shownAnyResults = toggleSidebarSearchFilter(filterType);
    filterType = null;
  }

  if (shownAnyResults) {
    showContextControls();

    cssProp(info.endSearchRule, 'display', 'block');
    cssProp(info.endSearchLine, 'display', 'block');

    tidySidebarSearchColumn();
  } else {
    const p = document.createElement('p');
    p.classList.add('wiki-search-no-results');
    p.appendChild(templateContent(info.noResultsString));
    info.results.appendChild(p);
  }

  restoreSidebarSearchResultsScrollOffset();
}

function tidyResults(results) {
  const tidiedResults =
    results.results.map(({doc, id}) => ({
      reference: id ?? null,
      referenceType: (id ? id.split(':')[0] : null),
      directory: (id ? id.split(':')[1] : null),
      data: doc,
    }));

  return tidiedResults;
}

function fillResultElements(results, {
  filterType = null,
} = {}) {
  const tidiedResults = tidyResults(results);

  let filteredResults = tidiedResults;

  if (filterType) {
    filteredResults = filteredResults
      .filter(result => result.referenceType === filterType);
  }

  if (!filterType) {
    filteredResults = filteredResults
      .filter(result => {
        if (result.referenceType !== 'track') return true;
        if (result.data.classification !== 'single') return true;
        return !filteredResults.find(otherResult => {
          if (otherResult.referenceType !== 'album') return false;
          return otherResult.name === result.parentName;
        });
      });
  }

  filteredResults = filteredResults

  while (info.results.firstChild) {
    info.results.firstChild.remove();
  }

  cssProp(info.resultsRule, 'display', 'block');
  cssProp(info.resultsContainer, 'display', 'block');

  if (empty(filteredResults)) {
    return false;
  }

  for (const result of filteredResults) {
    let el;
    try {
      el = generateSidebarSearchResult(result, filteredResults);
    } catch (error) {
      console.error(`Error showing result:`, result);
      console.error(error);
    }

    if (!el) continue;

    info.results.appendChild(el);
  }

  return true;
}

function showFilterElements(results) {
  const {queriedKind} = results;

  const tidiedResults = tidyResults(results);

  const allReferenceTypes =
    unique(tidiedResults.map(result => result.referenceType));

  let shownAny = false;

  forEachFilter((type, filterLink) => {
    filterLink.classList.remove('shown', 'hidden');

    if (allReferenceTypes.includes(type)) {
      shownAny = true;
      cssProp(filterLink, 'display', null);

      if (queriedKind) {
        filterLink.setAttribute('inert', 'inert');
      } else {
        filterLink.removeAttribute('inert');
      }

      if (type === queriedKind) {
        filterLink.classList.add('active-from-query');
      } else {
        filterLink.classList.remove('active-from-query');
      }
    } else {
      cssProp(filterLink, 'display', 'none');
    }
  });

  if (shownAny) {
    cssProp(info.filterContainer, 'display', null);
  } else {
    cssProp(info.filterContainer, 'display', 'none');
  }
}

function showContextControls() {
  const {session} = info;

  const shouldShow =
    session.activeQueryContextPagePathname &&
    location.pathname !== session.activeQueryContextPagePathname;

  if (shouldShow) {
    info.contextBackLink.href =
      session.activeQueryContextPagePathname;

    cssProp(info.contextBackLink,
      '--primary-color',
      session.activeQueryContextPageColor);

    while (info.contextBackLink.firstChild) {
      info.contextBackLink.firstChild.remove();
    }

    info.contextBackLink.appendChild(
      document.createTextNode(
        session.activeQueryContextPageName));

    cssProp(info.contextContainer, 'display', 'block');
  } else {
    cssProp(info.contextContainer, 'display', 'none');
  }
}

function generateSidebarSearchResult(result, results) {
  const preparedSlots = {
    color:
      result.data.color ?? null,

    name:
      getSearchResultName(result),

    imageSource:
      getSearchResultImageSource(result),
  };

  switch (result.referenceType) {
    case 'album': {
      preparedSlots.href =
        openAlbum(result.directory);

      preparedSlots.kindString =
        (result.data.classification === 'single'
          ? info.singleResultKindString
          : info.albumResultKindString);

      break;
    }

    case 'artist': {
      preparedSlots.href =
        openArtist(result.directory);

      preparedSlots.kindString =
        info.artistResultKindString;

      break;
    }

    case 'group': {
      preparedSlots.href =
        openGroup(result.directory);

      preparedSlots.kindString =
        info.groupResultKindString;

      break;
    }

    case 'flash': {
      preparedSlots.href =
        openFlash(result.directory);

      preparedSlots.kindString =
        info.flashResultKindString;

      break;
    }

    case 'tag': {
      preparedSlots.href =
        openArtTag(result.directory);

      preparedSlots.kindString =
        info.tagResultKindString;

      break;
    }

    case 'track': {
      preparedSlots.href =
        openTrack(result.directory);

      break;
    }

    default:
      return null;
  }

  const compareReferenceType = otherResult =>
    otherResult.referenceType === result.referenceType;

  const compareName = otherResult =>
    getSearchResultName(otherResult) === getSearchResultName(result);

  const ambiguousWith =
    results.filter(otherResult =>
      otherResult !== result &&
      compareReferenceType(otherResult) &&
      compareName(otherResult));

  if (!empty(ambiguousWith)) disambiguate: {
    const allAmbiguous = [result, ...ambiguousWith];

    // First search for an ideal disambiguation, which disambiguates
    // all ambiguous results in the same way.
    let disambiguation = null, i;
    for (i = 0; i < result.data.disambiguators.length; i++) {
      const disambiguations =
        allAmbiguous.map(r => r.data.disambiguators[i]);

      if (unique(disambiguations).length === allAmbiguous.length) {
        disambiguation = result.data.disambiguators[i];
        break;
      }
    }

    // Otherwise, search for a disambiguation which disambiguates
    // *this result* with at least one other result which it is
    // *otherwise* ambiguous with.
    if (!disambiguation) {
      for (i = 1; i < result.data.disambiguators.length; i++) {
        const otherwiseAmbiguousWith =
          ambiguousWith.filter(otherResult =>
            compareArrays(
              otherResult.data.disambiguators.slice(0, i),
              result.data.disambiguators.slice(0, i)));

        if (
          otherwiseAmbiguousWith.find(otherResult =>
            otherResult.data.disambiguators[i] !==
            result.data.disambiguators[i])
        ) {
          disambiguation = result.data.disambiguators[i];
          break;
        }
      }
    }

    // Otherwise, search for a disambiguation which disambiguates
    // this result at all.
    if (!disambiguation) {
      for (i = 0; i < result.data.disambiguators.length; i++) {
        if (
          ambiguousWith.find(otherResult =>
            otherResult.data.disambiguators[i] !==
            result.data.disambiguators[i])
        ) {
          disambiguation = result.data.disambiguators[i];
          break;
        }
      }
    }

    if (!disambiguation) {
      break disambiguate;
    }

    const string =
      info[result.referenceType + 'ResultDisambiguatorString' + (i + 1)];

    if (!string) break disambiguate;

    preparedSlots.disambiguate = disambiguation;
    preparedSlots.disambiguatorString = string;
  }

  return generateSidebarSearchResultTemplate(preparedSlots);
}

function getSearchResultName(result) {
  return (
    result.data.name ??
    result.data.primaryName ??
    null
  );
}

function getSearchResultImageSource(result) {
  const {artwork} = result.data;
  if (!artwork) return null;

  return (
    rebase(
      artwork.replace('<>', result.directory),
      'rebaseThumb'));
}

function generateSidebarSearchResultTemplate(slots) {
  const link = document.createElement('a');
  link.classList.add('wiki-search-result');

  if (slots.href) {
    link.setAttribute('href', slots.href);
  }

  if (slots.color) {
    cssProp(link, '--primary-color', slots.color);

    try {
      const colors =
        getColors(slots.color, {
          chroma: window.chroma,
        });
      cssProp(link, '--light-ghost-color', colors.lightGhost);
      cssProp(link, '--deep-color', colors.deep);
    } catch (error) {
      console.warn(error);
    }
  }

  const imgContainer = document.createElement('span');
  imgContainer.classList.add('wiki-search-result-image-container');

  if (slots.imageSource) {
    const img = document.createElement('img');
    img.classList.add('wiki-search-result-image');
    img.setAttribute('src', slots.imageSource);
    imgContainer.appendChild(img);
    if (slots.imageSource.endsWith('.mini.jpg')) {
      img.classList.add('has-warning');
    }
  } else {
    const placeholder = document.createElement('span');
    placeholder.classList.add('wiki-search-result-image-placeholder');
    imgContainer.appendChild(placeholder);
  }

  link.appendChild(imgContainer);

  const text = document.createElement('span');
  text.classList.add('wiki-search-result-text-area');

  if (slots.name) {
    const span = document.createElement('span');
    span.classList.add('wiki-search-result-name');
    span.appendChild(document.createTextNode(slots.name));
    text.appendChild(span);
  }

  let accentSpan = null;

  if (link.href) {
    const here = location.href.replace(/\/$/, '');
    const there = link.href.replace(/\/$/, '');
    if (here === there) {
      link.classList.add('current-result');
      accentSpan = document.createElement('span');
      accentSpan.classList.add('wiki-search-current-result-text');
      accentSpan.appendChild(templateContent(info.currentResultString));
    }
  }

  if (!accentSpan && slots.disambiguate) {
    accentSpan = document.createElement('span');
    accentSpan.classList.add('wiki-search-result-disambiguator');
    accentSpan.appendChild(
      templateContent(slots.disambiguatorString, {
        disambiguator: slots.disambiguate,
      }));
  }

  if (!accentSpan && slots.kindString) {
    accentSpan = document.createElement('span');
    accentSpan.classList.add('wiki-search-result-kind');
    accentSpan.appendChild(templateContent(slots.kindString));
  }

  if (accentSpan) {
    text.appendChild(document.createTextNode(' '));
    text.appendChild(accentSpan);
  }

  link.appendChild(text);

  link.addEventListener('click', () => {
    saveSidebarSearchResultsScrollOffset();
  });

  link.addEventListener('keydown', domEvent => {
    if (domEvent.key === 'ArrowDown') {
      const elem = link.nextElementSibling;
      if (elem) {
        domEvent.preventDefault();
        elem.focus({focusVisible: true});
      }
    } else if (domEvent.key === 'ArrowUp') {
      domEvent.preventDefault();
      const elem = link.previousElementSibling;
      if (elem) {
        elem.focus({focusVisible: true});
      } else {
        info.searchInput.focus();
      }
    }
  });

  return link;
}

function hideSidebarSearchResults() {
  cssProp(info.contextContainer, 'display', 'none');
  cssProp(info.filterContainer, 'display', 'none');

  cssProp(info.resultsRule, 'display', 'none');
  cssProp(info.resultsContainer, 'display', 'none');

  while (info.results.firstChild) {
    info.results.firstChild.remove();
  }

  cssProp(info.endSearchRule, 'display', 'none');
  cssProp(info.endSearchLine, 'display', 'none');

  restoreSidebarSearchColumn();
}

function focusFirstSidebarSearchResult() {
  const {settings, state} = info;

  const elem = info.results.firstChild;
  if (!elem?.classList.contains('wiki-search-result')) {
    return;
  }

  if (state.dismissChangeEventTimeout) {
    clearTimeout(state.dismissChangeEventTimeout);
  }

  state.dismissChangeEventTimeout =
    setTimeout(() => {
      state.dismissChangeEventTimeout = null;
    }, settings.dismissChangeEventAfterFocusingFirstResultLatency);

  elem.focus({focusVisible: true});
}

function saveSidebarSearchResultsScrollOffset() {
  const {session} = info;

  session.resultsScrollOffset = info.resultsContainer.scrollTop;
}

function restoreSidebarSearchResultsScrollOffset() {
  const {session} = info;

  if (session.resultsScrollOffset) {
    info.resultsContainer.scrollTop = session.resultsScrollOffset;
  }
}

function showSearchSidebarColumn() {
  const {state} = info;

  if (!info.searchSidebarColumn) {
    return;
  }

  if (!info.searchSidebarColumn.classList.contains('initially-hidden')) {
    return;
  }

  info.searchSidebarColumn.classList.remove('initially-hidden');

  if (info.searchSidebarColumn.id === 'sidebar-left') {
    info.pageContainer.classList.add('showing-sidebar-left');
  } else if (info.searchSidebarColumn.id === 'sidebar-right') {
    info.pageContainer.classList.add('showing-sidebar-right');
  }

  state.sidebarColumnShownForSearch = true;
}

function possiblyHideSearchSidebarColumn() {
  const {state} = info;

  if (!info.searchSidebarColumn) {
    return;
  }

  if (!state.sidebarColumnShownForSearch) {
    return;
  }

  info.searchSidebarColumn.classList.add('initially-hidden');

  if (info.searchSidebarColumn.id === 'sidebar-left') {
    info.pageContainer.classList.remove('showing-sidebar-left');
  } else if (info.searchSidebarColumn.id === 'sidebar-right') {
    info.pageContainer.classList.remove('showing-sidebar-right');
  }

  state.sidebarColumnShownForSearch = null;
}

// This should be called after results are shown, since it checks the
// elements added to understand the current search state.
function tidySidebarSearchColumn() {
  const {session, state} = info;

  // Don't *re-tidy* the sidebar if we've already tidied it to display
  // some results. This flag will get cleared if the search is dismissed
  // altogether (and the pre-tidy state is restored).
  if (state.tidiedSidebar) {
    return;
  }

  const hrefHere = location.href.replace(/\/$/, '');
  const currentPageIsResult =
    Array.from(info.results.querySelectorAll('a'))
      .some(link => {
        const hrefThere = link.href.replace(/\/$/, '');
        return hrefHere === hrefThere;
      });

  const currentPageIsContext =
    location.pathname === session.activeQueryContextPagePathname;

  // Don't tidy the sidebar if you've navigated to some other page than
  // what's in the current result list.
  if (
    !state.justPerformedActiveQuery &&
    !currentPageIsResult &&
    !currentPageIsContext
  ) {
    return;
  }

  state.tidiedSidebar = true;
  state.collapsedDetailsForTidiness = [];

  for (const box of info.searchSidebarColumn.querySelectorAll('.sidebar')) {
    if (box === info.searchBox) {
      continue;
    }

    for (const details of box.getElementsByTagName('details')) {
      if (details.open) {
        details.removeAttribute('open');
        state.collapsedDetailsForTidiness.push(details);
      }
    }
  }
}

function toggleSidebarSearchFilter(toggleType) {
  const {session} = info;

  if (!toggleType) return null;

  let shownAnyResults = null;

  forEachFilter((type, filterLink) => {
    if (type === toggleType) {
      const filterActive = filterLink.classList.toggle('active');
      const filterType = (filterActive ? type : null);

      if (cssProp(filterLink, 'display') !== 'none') {
        filterLink.classList.add(filterActive ? 'shown' : 'hidden');
      }

      if (session.activeQueryResults) {
        shownAnyResults =
          fillResultElements(session.activeQueryResults, {filterType});
      }

      session.activeFilterType = filterType;
    } else {
      filterLink.classList.remove('active');
    }
  });

  return shownAnyResults;
}

function restoreSidebarSearchColumn() {
  const {state} = info;

  if (!state.tidiedSidebar) {
    return;
  }

  for (const details of state.collapsedDetailsForTidiness) {
    details.setAttribute('open', '');
  }

  state.collapsedDetailsForTidiness = [];
  state.tidiedSidebar = null;

  info.searchInput.placeholder = info.standbyInputPlaceholder;
}

function considerRecallingRecentSidebarSearch() {
  const {session, state} = info;

  if (document.documentElement.dataset.urlKey === 'localized.home') {
    return forgetRecentSidebarSearch();
  }

  info.searchInput.placeholder = session.activeQuery;
  state.recallingRecentSearch = true;
}

function forgetRecentSidebarSearch() {
  clearActiveQuery();
  clearSidebarFilter();
}

async function handleDroppedIntoSearchInput(domEvent) {
  const itemByType = type =>
    Array.from(domEvent.dataTransfer.items)
      .find(item => item.type === type);

  const textItem = itemByType('text/plain');

  if (!textItem) return;

  domEvent.preventDefault();

  const getAssTring = item =>
    new Promise(res => item.getAsString(res))
      .then(string => string.trim());

  const timer = Date.now();

  let droppedText =
    await getAssTring(textItem);

  if (Date.now() - timer > 500) return;
  if (!droppedText) return;

  let droppedURL;
  try {
    droppedURL = new URL(droppedText);
  } catch {
    droppedURL = null;
  }

  if (droppedURL) matchLink: {
    const isDroppedURL = a =>
      a.toString() === droppedURL.toString();

    const matchingLinks =
      Array.from(document.getElementsByTagName('a'))
        .filter(a =>
          isDroppedURL(new URL(a.href, document.documentURI)));

    const latestDraggedLink = getLatestDraggedLink();

    if (!matchingLinks.includes(latestDraggedLink)) {
      break matchLink;
    }

    let matchedLink = latestDraggedLink;

    if (matchedLink.querySelector('.normal-content')) {
      matchedLink = matchedLink.cloneNode(true);
      for (const node of matchedLink.querySelectorAll('.normal-content')) {
        node.remove();
      }
    }

    droppedText = matchedLink.innerText;
  }

  if (droppedText.includes('-')) splitDashes: {
    if (droppedURL) break splitDashes;
    if (droppedText.includes(' ')) break splitDashes;

    const parts = droppedText.split('-');
    if (parts.length === 2) break splitDashes;

    droppedText = parts.join(' ');
  }

  info.searchInput.value = droppedText;
  activateSidebarSearch(info.searchInput.value);
}
