import {cssProp, formatDate} from '../client-util.js';

import {sortByDate} from '../../shared-util/sort.js';
import {chunkByConditions, chunkByProperties, empty, stitchArrays}
  from '../../shared-util/sugar.js';

export const info = {
  id: 'artistRollingWindowInfo',

  timeframeMonthsBefore: null,
  timeframeMonthsAfter: null,
  timeframeMonthsPeek: null,

  contributionKind: null,
  contributionGroup: null,

  timeframeSelectionSomeLine: null,
  timeframeSelectionNoneLine: null,

  timeframeSelectionContributionCount: null,
  timeframeSelectionTimeframeCount: null,
  timeframeSelectionFirstDate: null,
  timeframeSelectionLastDate: null,

  timeframeSelectionControl: null,
  timeframeSelectionMenu: null,
  timeframeSelectionPrevious: null,
  timeframeSelectionNext: null,

  timeframeEmptyLine: null,

  sourceArea: null,
  sourceGrid: null,
  sources: null,
};

export function getPageReferences() {
  if (document.documentElement.dataset.urlKey !== 'localized.artistRollingWindow') {
    return;
  }

  info.timeframeMonthsBefore =
    document.getElementById('timeframe-months-before');

  info.timeframeMonthsAfter =
    document.getElementById('timeframe-months-after');

  info.timeframeMonthsPeek =
    document.getElementById('timeframe-months-peek');

  info.contributionKind =
    document.getElementById('contribution-kind');

  info.contributionGroup =
    document.getElementById('contribution-group');

  info.timeframeSelectionSomeLine =
    document.getElementById('timeframe-selection-some');

  info.timeframeSelectionNoneLine =
    document.getElementById('timeframe-selection-none');

  info.timeframeSelectionContributionCount =
    document.getElementById('timeframe-selection-contribution-count');

  info.timeframeSelectionTimeframeCount =
    document.getElementById('timeframe-selection-timeframe-count');

  info.timeframeSelectionFirstDate =
    document.getElementById('timeframe-selection-first-date');

  info.timeframeSelectionLastDate =
    document.getElementById('timeframe-selection-last-date');

  info.timeframeSelectionControl =
    document.getElementById('timeframe-selection-control');

  info.timeframeSelectionMenu =
    document.getElementById('timeframe-selection-menu');

  info.timeframeSelectionPrevious =
    document.getElementById('timeframe-selection-previous');

  info.timeframeSelectionNext =
    document.getElementById('timeframe-selection-next');

  info.timeframeEmptyLine =
    document.getElementById('timeframe-empty');

  info.sourceArea =
    document.getElementById('timeframe-source-area');

  info.sourceGrid =
    info.sourceArea.querySelector('.grid-listing');

  info.sources =
    info.sourceGrid.getElementsByClassName('grid-item');
}

export function addPageListeners() {
  if (!info.sourceArea) {
    return;
  }

  for (const input of [
    info.timeframeMonthsBefore,
    info.timeframeMonthsAfter,
    info.timeframeMonthsPeek,
    info.contributionKind,
    info.contributionGroup,
  ]) {
    input.addEventListener('change', () => {
      updateArtistRollingWindow()
    });
  }

  info.timeframeSelectionMenu.addEventListener('change', () => {
    updateRollingWindowTimeframeSelection();
  });

  const eatClicks = (element, callback) => {
    element.addEventListener('click', domEvent => {
      domEvent.preventDefault();
      callback();
    });

    element.addEventListener('mousedown', domEvent => {
      if (domEvent.detail > 1) {
        domEvent.preventDefault();
      }
    });
  };

  eatClicks(info.timeframeSelectionNext, nextRollingTimeframeSelection);
  eatClicks(info.timeframeSelectionPrevious, previousRollingTimeframeSelection);
}

export function mutatePageContent() {
  if (!info.sourceArea) {
    return;
  }

  updateArtistRollingWindow();
}

function previousRollingTimeframeSelection() {
  const menu = info.timeframeSelectionMenu;

  if (menu.selectedIndex > 0) {
    menu.selectedIndex--;
  }

  updateRollingWindowTimeframeSelection();
}

function nextRollingTimeframeSelection() {
  const menu = info.timeframeSelectionMenu;

  if (menu.selectedIndex < menu.length - 1) {
    menu.selectedIndex++;
  }

  updateRollingWindowTimeframeSelection();
}

function getArtistRollingWindowSourceInfo() {
  const sourceElements =
    Array.from(info.sources);

  const sourceTimeElements =
    sourceElements
      .map(el => Array.from(el.getElementsByTagName('time')));

  const sourceTimeClasses =
    sourceTimeElements
      .map(times => times
        .map(time => Array.from(time.classList)));

  const sourceKinds =
    sourceTimeClasses
      .map(times => times
        .map(classes => classes
          .find(cl => cl.endsWith('-contribution-date'))
          .slice(0, -'-contribution-date'.length)));

  const sourceGroups =
    sourceElements
      .map(el =>
        Array.from(el.querySelectorAll('.contribution-group'))
          .map(data => data.value));

  const sourceDates =
    sourceTimeElements
      .map(times => times
        .map(time => new Date(time.getAttribute('datetime'))));

  return stitchArrays({
    element: sourceElements,
    kinds: sourceKinds,
    groups: sourceGroups,
    dates: sourceDates,
  });
}

function getArtistRollingWindowTimeframeInfo() {
  const contributionKind =
    info.contributionKind.value;

  const contributionGroup =
    info.contributionGroup.value;

  const sourceInfo =
    getArtistRollingWindowSourceInfo();

  const principalSources =
    sourceInfo.filter(source => {
      if (!source.kinds.includes(contributionKind)) {
        return false;
      }

      if (contributionGroup !== '-') {
        if (!source.groups.includes(contributionGroup)) {
          return false;
        }
      }

      return true;
    });

  const principalSourceDates =
    principalSources.map(source =>
      stitchArrays({
        kind: source.kinds,
        date: source.dates,
      }).find(({kind}) => kind === contributionKind)
        .date);

  const getPeekDate = inputDate => {
    const date = new Date(inputDate);

    date.setMonth(
      (date.getMonth()
     - parseInt(info.timeframeMonthsBefore.value)
     - parseInt(info.timeframeMonthsPeek.value)));

    return date;
  };

  const getEntranceDate = inputDate => {
    const date = new Date(inputDate);

    date.setMonth(
      (date.getMonth()
     - parseInt(info.timeframeMonthsBefore.value)));

    return date;
  };

  const getExitDate = inputDate => {
    const date = new Date(inputDate);

    date.setMonth(
      (date.getMonth()
     + parseInt(info.timeframeMonthsAfter.value)));

    return date;
  };

  const principalSourceIndices =
    Array.from({length: principalSources.length}, (_, i) => i);

  const timeframeSourceChunks =
    chunkByConditions(principalSourceIndices, [
      (previous, next) =>
        +principalSourceDates[previous] !==
        +principalSourceDates[next],
    ]);

  const timeframeSourceChunkDates =
    timeframeSourceChunks
      .map(indices => indices[0])
      .map(index => principalSourceDates[index]);

  const timeframeSourceChunkPeekDates =
    timeframeSourceChunkDates
      .map(getPeekDate);

  const timeframeSourceChunkEntranceDates =
    timeframeSourceChunkDates
      .map(getEntranceDate);

  const timeframeSourceChunkExitDates =
    timeframeSourceChunkDates
      .map(getExitDate);

  const peekDateInfo =
    stitchArrays({
      peek: timeframeSourceChunkPeekDates,
      indices: timeframeSourceChunks,
    }).map(({peek, indices}) => ({
        date: peek,
        peek: indices,
      }));

  const entranceDateInfo =
    stitchArrays({
      entrance: timeframeSourceChunkEntranceDates,
      indices: timeframeSourceChunks,
    }).map(({entrance, indices}) => ({
        date: entrance,
        entrance: indices,
      }));

  const exitDateInfo =
    stitchArrays({
      exit: timeframeSourceChunkExitDates,
      indices: timeframeSourceChunks,
    }).map(({exit, indices}) => ({
        date: exit,
        exit: indices,
      }));

  const dateInfoChunks =
    chunkByProperties(
      sortByDate([
        ...peekDateInfo,
        ...entranceDateInfo,
        ...exitDateInfo,
      ]),
      ['date']);

  const dateInfo =
    dateInfoChunks
      .map(({chunk}) =>
        Object.assign({
          peek: null,
          entrance: null,
          exit: null,
        }, ...chunk));

  const timeframeInfo =
    dateInfo.reduce(
      (accumulator, {date, peek, entrance, exit}) => {
        const previous = accumulator.at(-1);

        // These mustn't be mutated!
        let peeking = (previous ? previous.peeking : []);
        let tracking = (previous ? previous.tracking : []);

        if (peek) {
          peeking =
            peeking.concat(peek);
        }

        if (entrance) {
          peeking =
            peeking.filter(index => !entrance.includes(index));

          tracking =
            tracking.concat(entrance);
        }

        if (exit) {
          tracking =
            tracking.filter(index => !exit.includes(index));
        }

        return [...accumulator, {
          date,
          peeking,
          tracking,
          peek,
          entrance,
          exit,
        }];
      },
      []);

  const indicesToSources = indices =>
    (indices
      ? indices.map(index => principalSources[index])
      : null);

  const finalizedTimeframeInfo =
    timeframeInfo.map(({
      date,
      peeking,
      tracking,
      peek,
      entrance,
      exit,
    }) => ({
      date,
      peeking: indicesToSources(peeking),
      tracking: indicesToSources(tracking),
      peek: indicesToSources(peek),
      entrance: indicesToSources(entrance),
      exit: indicesToSources(exit),
    }));

  return finalizedTimeframeInfo;
}

function updateArtistRollingWindow() {
  const timeframeInfo =
    getArtistRollingWindowTimeframeInfo();

  if (empty(timeframeInfo)) {
    cssProp(info.timeframeSelectionControl, 'display', 'none');
    cssProp(info.timeframeSelectionSomeLine, 'display', 'none');
    cssProp(info.timeframeSelectionNoneLine, 'display', null);

    updateRollingWindowTimeframeSelection(timeframeInfo);

    return;
  }

  cssProp(info.timeframeSelectionControl, 'display', null);
  cssProp(info.timeframeSelectionSomeLine, 'display', null);
  cssProp(info.timeframeSelectionNoneLine, 'display', 'none');

  // The last timeframe is just the exit of the final tracked sources,
  // so we aren't going to display a menu option for it, and will just use
  // it as the end of the final option's date range.

  const usedTimeframes = timeframeInfo.slice(0, -1);
  const firstTimeframe = timeframeInfo.at(0);
  const lastTimeframe = timeframeInfo.at(-1);

  const sourceCount =
    timeframeInfo
      .flatMap(({entrance}) => entrance ?? [])
      .length;

  const timeframeCount =
    usedTimeframes.length;

  info.timeframeSelectionContributionCount.innerText = sourceCount;
  info.timeframeSelectionTimeframeCount.innerText = timeframeCount;

  const firstDate = firstTimeframe.date;
  const lastDate = lastTimeframe.date;

  info.timeframeSelectionFirstDate.innerText = formatDate(firstDate);
  info.timeframeSelectionLastDate.innerText = formatDate(lastDate);

  while (info.timeframeSelectionMenu.firstChild) {
    info.timeframeSelectionMenu.firstChild.remove();
  }

  for (const [index, timeframe] of usedTimeframes.entries()) {
    const nextTimeframe = timeframeInfo[index + 1];

    const option = document.createElement('option');

    option.appendChild(document.createTextNode(
      `${formatDate(timeframe.date)} – ${formatDate(nextTimeframe.date)}`));

    info.timeframeSelectionMenu.appendChild(option);
  }

  updateRollingWindowTimeframeSelection(timeframeInfo);
}

function updateRollingWindowTimeframeSelection(timeframeInfo) {
  timeframeInfo ??= getArtistRollingWindowTimeframeInfo();

  updateRollingWindowTimeframeSelectionControls(timeframeInfo);
  updateRollingWindowTimeframeSelectionSources(timeframeInfo);
}

function updateRollingWindowTimeframeSelectionControls(timeframeInfo) {
  const currentIndex =
    info.timeframeSelectionMenu.selectedIndex;

  const atFirstTimeframe =
    currentIndex === 0;

  // The last actual timeframe is empty and not displayed as a menu option.
  const atLastTimeframe =
    currentIndex === timeframeInfo.length - 2;

  if (atFirstTimeframe) {
    info.timeframeSelectionPrevious.removeAttribute('href');
  } else {
    info.timeframeSelectionPrevious.setAttribute('href', '#');
  }

  if (atLastTimeframe) {
    info.timeframeSelectionNext.removeAttribute('href');
  } else {
    info.timeframeSelectionNext.setAttribute('href', '#');
  }
}

function updateRollingWindowTimeframeSelectionSources(timeframeInfo) {
  const currentIndex =
    info.timeframeSelectionMenu.selectedIndex;

  const contributionGroup =
    info.contributionGroup.value;

  cssProp(info.sourceGrid, 'display', null);

  const {peeking: peekingSources, tracking: trackingSources} =
    (empty(timeframeInfo)
      ? {peeking: [], tracking: []}
      : timeframeInfo[currentIndex]);

  const peekingElements =
    peekingSources.map(source => source.element);

  const trackingElements =
    trackingSources.map(source => source.element);

  const showingElements =
    [...trackingElements, ...peekingElements];

  const hidingElements =
    Array.from(info.sources)
      .filter(element =>
        !peekingElements.includes(element) &&
        !trackingElements.includes(element));

  for (const element of peekingElements) {
    element.classList.add('peeking');
    element.classList.remove('tracking');
  }

  for (const element of trackingElements) {
    element.classList.remove('peeking');
    element.classList.add('tracking');
  }

  for (const element of hidingElements) {
    element.classList.remove('peeking');
    element.classList.remove('tracking');
    cssProp(element, 'display', 'none');
  }

  for (const element of showingElements) {
    cssProp(element, 'display', null);

    for (const time of element.getElementsByTagName('time')) {
      for (const className of time.classList) {
        if (!className.endsWith('-contribution-date')) continue;

        const kind = className.slice(0, -'-contribution-date'.length);
        if (kind === info.contributionKind.value) {
          cssProp(time, 'display', null);
        } else {
          cssProp(time, 'display', 'none');
        }
      }
    }

    for (const data of element.getElementsByClassName('contribution-group')) {
      if (contributionGroup === '-' || data.value !== contributionGroup) {
        cssProp(data, 'display', null);
      } else {
        cssProp(data, 'display', 'none');
      }
    }
  }

  if (empty(peekingElements) && empty(trackingElements)) {
    cssProp(info.timeframeEmptyLine, 'display', null);
  } else {
    cssProp(info.timeframeEmptyLine, 'display', 'none');
  }
}
