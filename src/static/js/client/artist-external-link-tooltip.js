/* eslint-env browser */

import {accumulateSum, empty} from '../../shared-util/sugar.js';

import {info as hoverableTooltipInfo, repositionCurrentTooltip}
  from './hoverable-tooltip.js';

// These don't need to have tooltip events specially added as
// they're implemented with "text with tooltip" components.

export const info = {
  id: 'artistExternalLinkTooltipInfo',

  tooltips: null,
  tooltipRows: null,

  settings: {
    // This is the maximum distance, in CSS pixels, that the mouse
    // can appear to be moving per second while still considered
    // "idle". A greater value means higher tolerance for small
    // movements.
    maximumIdleSpeed: 40,

    // Leaving the mouse idle for this amount of time, over a single
    // row of the tooltip, will cause a column of supplemental info
    // to display.
    mouseIdleShowInfoDelay: 1000,

    // If none of these tooltips are visible for this amount of time,
    // the supplemental info column is hidden. It'll never disappear
    // while a tooltip is actually visible.
    hideInfoAfterTooltipHiddenDelay: 2250,
  },

  state: {
    // This is shared by all tooltips.
    showingTooltipInfo: false,

    mouseIdleTimeout: null,
    hideInfoTimeout: null,

    mouseMovementPositions: [],
    mouseMovementTimestamps: [],
  },
};

export function getPageReferences() {
  info.tooltips =
    Array.from(document.getElementsByClassName('contribution-tooltip'));

  info.tooltipRows =
    info.tooltips.map(tooltip =>
      Array.from(tooltip.getElementsByClassName('icon')));
}

export function addInternalListeners() {
  hoverableTooltipInfo.event.whenTooltipShows.push(({tooltip}) => {
    const {state} = info;

    if (info.tooltips.includes(tooltip)) {
      clearTimeout(state.hideInfoTimeout);
      state.hideInfoTimeout = null;
    }
  });

  hoverableTooltipInfo.event.whenTooltipHides.push(() => {
    const {settings, state} = info;

    if (state.showingTooltipInfo) {
      state.hideInfoTimeout =
        setTimeout(() => {
          state.hideInfoTimeout = null;
          hideArtistExternalLinkTooltipInfo();
        }, settings.hideInfoAfterTooltipHiddenDelay);
    } else {
      clearTimeout(state.mouseIdleTimeout);
      state.mouseIdleTimeout = null;
    }
  });
}

export function addPageListeners() {
  for (const tooltip of info.tooltips) {
    tooltip.addEventListener('mousemove', domEvent => {
      handleArtistExternalLinkTooltipMouseMoved(domEvent);
    });

    tooltip.addEventListener('mouseout', () => {
      const {state} = info;

      clearTimeout(state.mouseIdleTimeout);
      state.mouseIdleTimeout = null;
    });
  }

  for (const tooltipRow of info.tooltipRows.flat()) {
    tooltipRow.addEventListener('mouseover', () => {
      const {state} = info;

      clearTimeout(state.mouseIdleTimeout);
      state.mouseIdleTimeout = null;
    });
  }
}

function handleArtistExternalLinkTooltipMouseMoved(domEvent) {
  const {settings, state} = info;

  if (state.showingTooltipInfo) {
    return;
  }

  // Clean out expired mouse movements

  const expiryTime = 1000;

  if (!empty(state.mouseMovementTimestamps)) {
    const firstRecentMovementIndex =
      state.mouseMovementTimestamps
        .findIndex(value => Date.now() - value <= expiryTime);

    if (firstRecentMovementIndex === -1) {
      state.mouseMovementTimestamps.splice(0);
      state.mouseMovementPositions.splice(0);
    } else if (firstRecentMovementIndex > 0) {
      state.mouseMovementTimestamps.splice(0, firstRecentMovementIndex - 1);
      state.mouseMovementPositions.splice(0, firstRecentMovementIndex - 1);
    }
  }

  state.mouseMovementTimestamps.push(Date.now());
  state.mouseMovementPositions.push([domEvent.screenX, domEvent.screenY]);

  // We can't really compute speed without having
  // at least two data points!
  if (state.mouseMovementPositions.length < 2) {
    return;
  }

  const movementTravelDistances =
    state.mouseMovementPositions.map((current, index, array) => {
      if (index === 0) return 0;

      const previous = array[index - 1];
      const deltaX = current[0] - previous[0];
      const deltaY = current[1] - previous[1];
      return Math.sqrt(deltaX ** 2 + deltaY ** 2);
    });

  const totalTravelDistance =
    accumulateSum(movementTravelDistances);

  // In seconds rather than milliseconds.
  const timeSinceFirstMovement =
    (Date.now() - state.mouseMovementTimestamps[0]) / 1000;

  const averageSpeed =
    Math.floor(totalTravelDistance / timeSinceFirstMovement);

  if (averageSpeed > settings.maximumIdleSpeed) {
    clearTimeout(state.mouseIdleTimeout);
    state.mouseIdleTimeout = null;
  }

  if (state.mouseIdleTimeout) {
    return;
  }

  state.mouseIdleTimeout =
    setTimeout(() => {
      state.mouseIdleTimeout = null;
      showArtistExternalLinkTooltipInfo();
    }, settings.mouseIdleShowInfoDelay);
}

function showArtistExternalLinkTooltipInfo() {
  const {state} = info;

  state.showingTooltipInfo = true;

  for (const tooltip of info.tooltips) {
    tooltip.classList.add('show-info');
  }

  repositionCurrentTooltip();
}

function hideArtistExternalLinkTooltipInfo() {
  const {state} = info;

  state.showingTooltipInfo = false;

  for (const tooltip of info.tooltips) {
    tooltip.classList.remove('show-info');
  }
}
