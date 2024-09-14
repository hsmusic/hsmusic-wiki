/* eslint-env browser */

import {getColors} from '../../shared-util/colors.js';
import {accumulateSum, empty} from '../../shared-util/sugar.js';

import {
  cssProp,
  openAlbum,
  openArtist,
  openArtTag,
  openFlash,
  openGroup,
  openTrack,
  rebase,
  templateContent,
} from '../client-util.js';

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

  progressRule: null,
  progressContainer: null,
  progressLabel: null,
  progressBar: null,

  failedRule: null,
  failedContainer: null,

  resultsRule: null,
  resultsContainer: null,
  results: null,

  endSearchRule: null,
  endSearchLine: null,
  endSearchLink: null,

  preparingString: null,
  loadingDataString: null,
  searchingString: null,
  failedString: null,

  noResultsString: null,
  currentResultString: null,
  endSearchString: null,

  albumResultKindString: null,
  artistResultKindString: null,
  groupResultKindString: null,
  tagResultKindString: null,

  state: {
    sidebarColumnShownForSearch: null,

    tidiedSidebar: null,
    collapsedDetailsForTidiness: null,

    workerStatus: null,
    searchStage: null,

    stoppedTypingTimeout: null,
    stoppedScrollingTimeout: null,

    indexDownloadStatuses: Object.create(null),

    currentValue: null,
  },

  session: {
    activeQuery: {
      type: 'string',
    },

    activeQueryResults: {
      type: 'json',
      maxLength: settings => settings.maxActiveResultsStorage,
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

    maxActiveResultsStorage: 100000,
  },
};

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

  info.currentResultString =
    findString('current-result');

  info.endSearchString =
    findString('end-search');

  info.albumResultKindString =
    findString('album-result-kind');

  info.artistResultKindString =
    findString('artist-result-kind');

  info.groupResultKindString =
    findString('group-result-kind');

  info.tagResultKindString =
    findString('tag-result-kind');
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
}

function trackSidebarSearchInputChanged() {
  const {state} = info;

  const newValue = info.searchInput.value;

  if (newValue === state.currentValue) {
    return false;
  } else {
    state.currentValue = newValue;
    return !!newValue;
  }
}

export function addPageListeners() {
  if (!info.searchInput) return;

  info.searchInput.addEventListener('change', _domEvent => {
    if (trackSidebarSearchInputChanged()) {
      activateSidebarSearch(info.searchInput.value);
    }
  });

  info.searchInput.addEventListener('input', _domEvent => {
    const {settings, state} = info;

    trackSidebarSearchInputChanged();

    if (!info.searchInput.value) {
      clearSidebarSearch();
      return;
    }

    if (state.stoppedTypingTimeout) {
      clearTimeout(state.stoppedTypingTimeout);
    }

    state.stoppedTypingTimeout =
      setTimeout(() => {
        activateSidebarSearch(info.searchInput.value);
      }, settings.stoppedTypingDelay);
  });

  info.searchInput.addEventListener('keydown', domEvent => {
    if (domEvent.key === 'ArrowDown') {
      const elem = info.results?.firstChild;
      if (elem && !elem.classList.contains('wiki-search-no-results')) {
        domEvent.preventDefault();
        elem.focus({focusVisible: true});
      }
    }
  });

  info.endSearchLink.addEventListener('click', domEvent => {
    domEvent.preventDefault();
    clearSidebarSearch();
    possiblyHideSearchSidebarColumn();
    restoreSidebarSearchColumn();
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
}

export function initializeState() {
  const {session} = info;

  if (!info.searchInput) return;

  if (session.activeQuery) {
    info.searchInput.value = session.activeQuery;
    if (session.repeatQueryOnReload) {
      activateSidebarSearch(session.activeQuery);
    } else if (session.activeQueryResults) {
      showSidebarSearchResults(session.activeQueryResults);
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

async function activateSidebarSearch(query) {
  const {session, state} = info;

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

  state.searchStage = 'complete';
  updateSidebarSearchStatus();

  session.activeQuery = query;
  session.activeQueryResults = results;
  session.resultsScrollOffset = 0;

  showSidebarSearchResults(results);
}

function clearSidebarSearch() {
  const {session, state} = info;

  if (state.stoppedTypingTimeout) {
    clearTimeout(state.stoppedTypingTimeout);
    state.stoppedTypingTimeout = null;
  }

  info.searchBox.classList.remove('showing-results');
  info.searchSidebarColumn.classList.remove('search-showing-results');

  info.searchInput.value = '';

  state.searchStage = null;

  session.activeQuery = null;
  session.activeQueryResults = null;
  session.resultsScrollOffset = null;

  hideSidebarSearchResults();
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
  console.debug(`Showing search results:`, results);

  showSearchSidebarColumn();

  const flatResults =
    Object.entries(results)
      .filter(([index]) => index === 'generic')
      .flatMap(([index, results]) => results
        .flatMap(({doc, id}) => ({
          index,
          reference: id ?? null,
          referenceType: (id ? id.split(':')[0] : null),
          directory: (id ? id.split(':')[1] : null),
          data: doc,
        })));

  info.searchBox.classList.add('showing-results');
  info.searchSidebarColumn.classList.add('search-showing-results');

  while (info.results.firstChild) {
    info.results.firstChild.remove();
  }

  cssProp(info.resultsRule, 'display', 'block');
  cssProp(info.resultsContainer, 'display', 'block');

  if (empty(flatResults)) {
    const p = document.createElement('p');
    p.classList.add('wiki-search-no-results');
    p.appendChild(templateContent(info.noResultsString));
    info.results.appendChild(p);
  }

  for (const result of flatResults) {
    const el = generateSidebarSearchResult(result);
    if (!el) continue;

    info.results.appendChild(el);
  }

  if (!empty(flatResults)) {
    cssProp(info.endSearchRule, 'display', 'block');
    cssProp(info.endSearchLine, 'display', 'block');

    tidySidebarSearchColumn();
  }

  restoreSidebarSearchResultsScrollOffset();
}

function generateSidebarSearchResult(result) {
  const preparedSlots = {
    color:
      result.data.color ?? null,

    name:
      result.data.name ?? result.data.primaryName ?? null,

    imageSource:
      getSearchResultImageSource(result),
  };

  switch (result.referenceType) {
    case 'album': {
      preparedSlots.href =
        openAlbum(result.directory);

      preparedSlots.kindString =
        info.albumResultKindString;

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

  return generateSidebarSearchResultTemplate(preparedSlots);
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
  cssProp(info.resultsRule, 'display', 'none');
  cssProp(info.resultsContainer, 'display', 'none');

  while (info.results.firstChild) {
    info.results.firstChild.remove();
  }

  cssProp(info.endSearchRule, 'display', 'none');
  cssProp(info.endSearchLine, 'display', 'none');
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
  const {state} = info;

  // Don't *re-tidy* the sidebar if we've already tidied it to display
  // some results. This flag will get cleared if the search is dismissed
  // altogether (and the pre-tidy state is restored).
  if (state.tidiedSidebar) {
    return;
  }

  const here = location.href.replace(/\/$/, '');
  const currentPageIsResult =
    Array.from(info.results.querySelectorAll('a'))
      .some(link => {
        const there = link.href.replace(/\/$/, '');
        return here === there;
      });

  // Don't tidy the sidebar if you've navigated to some other page than
  // what's in the current result list.
  if (!currentPageIsResult) {
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
}
