/* eslint-env browser */

import {empty, filterMultipleArrays} from '../../shared-util/sugar.js';

import {WikiRect} from '../rectangles.js';

import {
  cssProp,
  dispatchInternalEvent,
  getVisuallyContainingElement,
  pointIsOverAnyOf,
} from '../client-util.js';

import {info as stickyHeadingInfo} from './sticky-heading.js';

export const info = {
  id: 'hoverableTooltipInfo',

  settings: {
    // Hovering has two speed settings. The normal setting is used by default,
    // and once a tooltip is displayed as a result of hover, the entire tooltip
    // system will enter a "fast hover mode" - hovering will activate tooltips
    // sooner. "Fast hover mode" is disabled after a sustained duration of not
    // hovering over any hoverables; it's meant only to accelerate switching
    // tooltips while still deciding, or getting a quick overview across more
    // than one tooltip.
    normalHoverInfoDelay: 400,
    fastHoveringInfoDelay: 150,
    endFastHoveringDelay: 500,

    // Focusing has a single speed setting, which is how long it will take to
    // enter a functional "focus mode" (though it's not actually implemented
    // in terms of this state). As soon as "focus mode" is entered, the tooltip
    // for the current hoverable is displayed, and focusing another hoverable
    // will cause the current tooltip to be swapped for that one immediately.
    // "Focus mode" ends as soon as anything apart from a tooltip or hoverable
    // is focused, and it will be necessary to wait on this delay again.
    focusInfoDelay: 750,

    hideTooltipDelay: 500,

    // If a tooltip that's transitioning to hidden is hovered during the grace
    // period (or the corresponding hoverable is hovered at any point in the
    // transition), it'll cancel out of this animation immediately.
    transitionHiddenDuration: 300,
    inertGracePeriod: 100,
  },

  state: {
    // These maps store a record for each registered element and related state
    // and registration info, if applicable.
    registeredTooltips: new Map(),
    registeredHoverables: new Map(),

    // These are common across all tooltips, rather than stored individually,
    // based on the principles that 1) only a single tooltip can be displayed
    // at once, and 2) likewise, only a single hoverable can be hovered,
    // focused, or otherwise active at once.
    hoverTimeout: null,
    focusTimeout: null,
    touchTimeout: null,
    hideTimeout: null,
    transitionHiddenTimeout: null,
    inertGracePeriodTimeout: null,
    currentlyShownTooltip: null,
    currentlyActiveHoverable: null,
    currentlyTransitioningHiddenTooltip: null,
    previouslyActiveHoverable: null,
    tooltipWasJustHidden: false,
    hoverableWasRecentlyTouched: false,

    // Fast hovering is a global mode which is activated as soon as any tooltip
    // is displayed and turns off after a delay of no hoverables being hovered.
    // Note that fast hovering may be turned off while hovering a tooltip, but
    // it will never be turned off while idling over a hoverable.
    fastHovering: false,
    endFastHoveringTimeout: false,

    // These track the identifiers of current touches and a record of current
    // identifiers that are "banished" by scrolling - that is, touches which
    // existed while the page scrolled and were probably responsible for that
    // scrolling. This is a bit loose (we can't actually tell which touches
    // caused the page to scroll) but it's intended to keep scrolling the page
    // from causing the current tooltip to be hidden.
    currentTouchIdentifiers: new Set(),
    touchIdentifiersBanishedByScrolling: new Set(),

    // This is a two-item array that tracks the direction we've already
    // dynamically placed the current tooltip. If we *reposition* the tooltip
    // (because its dimensions changed), we'll try to follow this anchor first.
    dynamicTooltipAnchorDirection: null,
  },

  event: {
    whenTooltipShows: [],
    whenTooltipHides: [],
  },
};

// Adds DOM event listeners, so must be called during addPageListeners step.
export function registerTooltipElement(tooltip) {
  const {state} = info;

  if (!tooltip)
    throw new Error(`Expected tooltip`);

  if (state.registeredTooltips.has(tooltip))
    throw new Error(`This tooltip is already registered`);

  // No state or registration info here.
  state.registeredTooltips.set(tooltip, {});

  tooltip.addEventListener('mouseenter', () => {
    handleTooltipMouseEntered(tooltip);
  });

  tooltip.addEventListener('mouseleave', () => {
    handleTooltipMouseLeft(tooltip);
  });

  tooltip.addEventListener('focusin', event => {
    handleTooltipReceivedFocus(tooltip, event.relatedTarget);
  });

  tooltip.addEventListener('focusout', event => {
    // This event gets activated for tabbing *between* links inside the
    // tooltip, which is no good and certainly doesn't represent the focus
    // leaving the tooltip.
    if (currentlyShownTooltipHasFocus(event.relatedTarget)) return;

    handleTooltipLostFocus(tooltip, event.relatedTarget);
  });
}

// Adds DOM event listeners, so must be called during addPageListeners step.
export function registerTooltipHoverableElement(hoverable, tooltip) {
  const {state} = info;

  if (!hoverable || !tooltip)
    if (hoverable)
      throw new Error(`Expected hoverable and tooltip, got only hoverable`);
    else
      throw new Error(`Expected hoverable and tooltip, got neither`);

  if (!state.registeredTooltips.has(tooltip))
    throw new Error(`Register tooltip before registering hoverable`);

  if (state.registeredHoverables.has(hoverable))
    throw new Error(`This hoverable is already registered`);

  state.registeredHoverables.set(hoverable, {tooltip});

  hoverable.addEventListener('mouseenter', () => {
    handleTooltipHoverableMouseEntered(hoverable);
  });

  hoverable.addEventListener('mouseleave', () => {
    handleTooltipHoverableMouseLeft(hoverable);
  });

  hoverable.addEventListener('focusin', event => {
    handleTooltipHoverableReceivedFocus(hoverable, event);
  });

  hoverable.addEventListener('focusout', event => {
    handleTooltipHoverableLostFocus(hoverable, event);
  });

  hoverable.addEventListener('touchend', event => {
    handleTooltipHoverableTouchEnded(hoverable, event);
  });

  hoverable.addEventListener('click', event => {
    handleTooltipHoverableClicked(hoverable, event);
  });
}

function handleTooltipMouseEntered(tooltip) {
  const {state} = info;

  if (state.currentlyTransitioningHiddenTooltip) {
    cancelTransitioningTooltipHidden(true);
    return;
  }

  if (state.currentlyShownTooltip !== tooltip) return;

  // Don't time out the current tooltip while hovering it.

  if (state.hideTimeout) {
    clearTimeout(state.hideTimeout);
    state.hideTimeout = null;
  }
}

function handleTooltipMouseLeft(tooltip) {
  const {settings, state} = info;

  if (state.currentlyShownTooltip !== tooltip) return;

  // Start timing out the current tooltip when it's left. This could be
  // canceled by mousing over a hoverable, or back over the tooltip again.
  if (!state.hideTimeout) {
    state.hideTimeout =
      setTimeout(() => {
        state.hideTimeout = null;
        hideCurrentlyShownTooltip();
      }, settings.hideTooltipDelay);
  }
}

function handleTooltipReceivedFocus(_tooltip) {
  const {state} = info;

  // Cancel the tooltip-hiding timeout if it exists. The tooltip will never
  // be hidden while it contains the focus anyway, but this ensures the timeout
  // will be suitably reset when the tooltip loses focus.
  if (state.hideTimeout) {
    clearTimeout(state.hideTimeout);
    state.hideTimeout = null;
  }
}

function handleTooltipLostFocus(_tooltip) {
  // Hide the current tooltip right away when it loses focus. Specify intent
  // to replace - while we don't strictly know if another tooltip is going to
  // immediately replace it, the mode of navigating with tab focus (once one
  // tooltip has been activated) is a "switch focus immediately" kind of
  // interaction in its nature.
  hideCurrentlyShownTooltip(true);
}

function handleTooltipHoverableMouseEntered(hoverable) {
  const {settings, state} = info;
  const {tooltip} = state.registeredHoverables.get(hoverable);

  // If this tooltip was transitioning to hidden, hovering should cancel that
  // animation and show it immediately.

  if (tooltip === state.currentlyTransitioningHiddenTooltip) {
    cancelTransitioningTooltipHidden(true);
    return;
  }

  // Start a timer to show the corresponding tooltip, with the delay depending
  // on whether fast hovering or not. This could be canceled by mousing out of
  // the hoverable.

  const hoverTimeoutDelay =
    (state.fastHovering
      ? settings.fastHoveringInfoDelay
      : settings.normalHoverInfoDelay);

  state.hoverTimeout =
    setTimeout(() => {
      state.hoverTimeout = null;
      state.fastHovering = true;
      showTooltipFromHoverable(hoverable);
    }, hoverTimeoutDelay);

  // Don't stop fast hovering while over any hoverable.
  if (state.endFastHoveringTimeout) {
    clearTimeout(state.endFastHoveringTimeout);
    state.endFastHoveringTimeout = null;
  }

  // Don't time out the current tooltip while over any hoverable.
  if (state.hideTimeout) {
    clearTimeout(state.hideTimeout);
    state.hideTimeout = null;
  }
}

function handleTooltipHoverableMouseLeft(_hoverable) {
  const {settings, state} = info;

  // Don't show a tooltip when not over a hoverable!
  if (state.hoverTimeout) {
    clearTimeout(state.hoverTimeout);
    state.hoverTimeout = null;
  }

  // Start timing out fast hovering (if active) when not over a hoverable.
  // This will only be canceled by mousing over another hoverable.
  if (state.fastHovering && !state.endFastHoveringTimeout) {
    state.endFastHoveringTimeout =
      setTimeout(() => {
        state.endFastHoveringTimeout = null;
        state.fastHovering = false;
      }, settings.endFastHoveringDelay);
  }

  // Start timing out the current tooltip when mousing not over a hoverable.
  // This could be canceled by mousing over another hoverable, or over the
  // currently shown tooltip.
  if (state.currentlyShownTooltip && !state.hideTimeout) {
    state.hideTimeout =
      setTimeout(() => {
        state.hideTimeout = null;
        hideCurrentlyShownTooltip();
      }, settings.hideTooltipDelay);
  }
}

function handleTooltipHoverableReceivedFocus(hoverable) {
  const {settings, state} = info;

  // By default, display the corresponding tooltip after a delay.

  state.focusTimeout =
    setTimeout(() => {
      state.focusTimeout = null;
      showTooltipFromHoverable(hoverable);
    }, settings.focusInfoDelay);

  // If a tooltip was just hidden - which is almost certainly a result of the
  // focus changing - then display this tooltip immediately, canceling the
  // above timeout.

  if (state.tooltipWasJustHidden) {
    clearTimeout(state.focusTimeout);
    state.focusTimeout = null;

    showTooltipFromHoverable(hoverable);
  }
}

function handleTooltipHoverableLostFocus(hoverable, domEvent) {
  const {state} = info;

  // Don't show a tooltip from focusing a hoverable if it isn't focused
  // anymore! If another hoverable is receiving focus, that will be evaluated
  // and set its own focus timeout after we clear the previous one here.
  if (state.focusTimeout) {
    clearTimeout(state.focusTimeout);
    state.focusTimeout = null;
  }

  // Unless focus is entering the tooltip itself, hide the tooltip immediately.
  // This will set the tooltipWasJustHidden flag, which is detected by a newly
  // focused hoverable, if applicable. Always specify intent to replace when
  // navigating via tab focus. (Check `handleTooltipLostFocus` for details.)
  if (!currentlyShownTooltipHasFocus(domEvent.relatedTarget)) {
    hideCurrentlyShownTooltip(true);
  }
}

function handleTooltipHoverableTouchEnded(hoverable, domEvent) {
  const {state} = info;
  const {tooltip} = state.registeredHoverables.get(hoverable);

  // Don't proceed if this hoverable's tooltip is already visible - in that
  // case touching the hoverable again should behave just like a normal click.
  if (state.currentlyShownTooltip === tooltip) {
    // If the hoverable was *recently* touched - meaning that this is a second
    // touchend in short succession - then just letting the click come through
    // naturally would (depending on timing) not actually navigate anywhere,
    // because we've deliberately banished the *first* touch from navigation.
    // We do want the second touch to navigate, so clear that recently-touched
    // state, allowing this touch's click to behave as normal.
    if (state.hoverableWasRecentlyTouched) {
      clearTimeout(state.touchTimeout);
      state.touchTimeout = null;
      state.hoverableWasRecentlyTouched = false;
    }

    // Otherwise, this is just a second touch after enough time has passed
    // that the one which showed the tooltip is no longer "recent", and we're
    // not in any special state. The link will navigate to its page just like
    // normal.
    return;
  }

  const touches = Array.from(domEvent.changedTouches);
  const identifiers = touches.map(touch => touch.identifier);

  // Don't process touch events that were "banished" because the page was
  // scrolled while those touches were active, and most likely as a result of
  // them.
  filterMultipleArrays(touches, identifiers,
    (_touch, identifier) =>
      !state.touchIdentifiersBanishedByScrolling.has(identifier));

  if (empty(touches)) return;

  // Don't proceed if none of the (just-ended) touches ended over the
  // hoverable.

  const pointIsOverThisHoverable = pointIsOverAnyOf([hoverable]);

  const anyTouchEndedOverHoverable =
    touches.some(({clientX, clientY}) =>
      pointIsOverThisHoverable(clientX, clientY));

  if (!anyTouchEndedOverHoverable) {
    return;
  }

  if (state.touchTimeout) {
    clearTimeout(state.touchTimeout);
    state.touchTimeout = null;
  }

  // Show the tooltip right away.
  showTooltipFromHoverable(hoverable);

  // Set a state, for a brief but not instantaneous period, indicating that a
  // hoverable was recently touched. The touchend event may precede the click
  // event by some time, and we don't want to navigate away from the page as
  // a result of the click event which this touch precipitated.
  state.hoverableWasRecentlyTouched = true;
  state.touchTimeout =
    setTimeout(() => {
      state.touchTimeout = null;
      state.hoverableWasRecentlyTouched = false;
    }, 1200);
}

function handleTooltipHoverableClicked(hoverable) {
  const {state} = info;

  // Don't navigate away from the page if the this hoverable was recently
  // touched (and had its tooltip activated). That flag won't be set if its
  // tooltip was already open before the touch.
  if (
    state.currentlyActiveHoverable === hoverable &&
    state.hoverableWasRecentlyTouched
  ) {
    event.preventDefault();
  }
}

export function currentlyShownTooltipHasFocus(focusElement = document.activeElement) {
  const {state} = info;

  const {
    currentlyShownTooltip: tooltip,
    currentlyActiveHoverable: hoverable,
  } = state;

  // If there's no tooltip, it can't possibly have focus.
  if (!tooltip) return false;

  // If the tooltip literally contains (or is) the focused element, then that's
  // the principle condition we're looking for.
  if (tooltip.contains(focusElement)) return true;

  // If the hoverable *which opened the tooltip* is focused, then that also
  // represents the tooltip being focused (in its currently shown state).
  if (hoverable.contains(focusElement)) return true;

  return false;
}

export function beginTransitioningTooltipHidden(tooltip) {
  const {settings, state} = info;

  if (state.currentlyTransitioningHiddenTooltip) {
    cancelTransitioningTooltipHidden();
  }

  cssProp(tooltip, {
    'display': 'block',
    'opacity': '0',

    'transition-property': 'opacity',
    'transition-timing-function':
      `steps(${Math.ceil(settings.transitionHiddenDuration / 60)}, end)`,
    'transition-duration':
      `${settings.transitionHiddenDuration / 1000}s`,
  });

  state.currentlyTransitioningHiddenTooltip = tooltip;
  state.transitionHiddenTimeout =
    setTimeout(() => {
      endTransitioningTooltipHidden();
    }, settings.transitionHiddenDuration);
}

export function cancelTransitioningTooltipHidden(andShow = false) {
  const {state} = info;

  endTransitioningTooltipHidden();

  if (andShow) {
    showTooltipFromHoverable(state.previouslyActiveHoverable);
  }
}

export function endTransitioningTooltipHidden() {
  const {state} = info;
  const {currentlyTransitioningHiddenTooltip: tooltip} = state;

  if (!tooltip) return;

  cssProp(tooltip, {
    'display': null,
    'opacity': null,
    'transition-property': null,
    'transition-timing-function': null,
    'transition-duration': null,
  });

  state.currentlyTransitioningHiddenTooltip = null;

  if (state.inertGracePeriodTimeout) {
    clearTimeout(state.inertGracePeriodTimeout);
    state.inertGracePeriodTimeout = null;
  }

  if (state.transitionHiddenTimeout) {
    clearTimeout(state.transitionHiddenTimeout);
    state.transitionHiddenTimeout = null;
  }
}

export function hideCurrentlyShownTooltip(intendingToReplace = false) {
  const {settings, state, event} = info;
  const {currentlyShownTooltip: tooltip} = state;

  // If there was no tooltip to begin with, we're functionally in the desired
  // state already, so return true.
  if (!tooltip) return true;

  // Never hide the tooltip if it's focused.
  if (currentlyShownTooltipHasFocus()) return false;

  state.currentlyActiveHoverable.classList.remove('has-visible-tooltip');

  // If there's no intent to replace this tooltip, it's the last one currently
  // apparent in the interaction, and should be hidden with a transition.
  if (intendingToReplace) {
    cssProp(tooltip, 'display', 'none');
  } else {
    beginTransitioningTooltipHidden(state.currentlyShownTooltip);
  }

  // Wait just a moment before making the tooltip inert. You might react
  // (to the ghosting, or just to time passing) and realize you wanted
  // to look at the tooltip after all - this delay gives a little buffer
  // to second guess letting it disappear.
  state.inertGracePeriodTimeout =
    setTimeout(() => {
      tooltip.inert = true;
    }, settings.inertGracePeriod);

  state.previouslyActiveHoverable = state.currentlyActiveHoverable;

  state.currentlyShownTooltip = null;
  state.currentlyActiveHoverable = null;

  state.dynamicTooltipAnchorDirection = null;

  // Set this for one tick of the event cycle.
  state.tooltipWasJustHidden = true;
  setTimeout(() => {
    state.tooltipWasJustHidden = false;
  });

  dispatchInternalEvent(event, 'whenTooltipHides', {
    tooltip,
  });

  return true;
}

export function showTooltipFromHoverable(hoverable) {
  const {state, event} = info;
  const {tooltip} = state.registeredHoverables.get(hoverable);

  if (!hideCurrentlyShownTooltip(true)) return false;

  // Cancel out another tooltip that's transitioning hidden, if that's going
  // on - it's a distraction that this tooltip is now replacing.
  cancelTransitioningTooltipHidden();

  hoverable.classList.add('has-visible-tooltip');

  positionTooltipFromHoverableWithBrains(hoverable);

  cssProp(tooltip, 'display', 'block');
  tooltip.inert = false;

  state.currentlyShownTooltip = tooltip;
  state.currentlyActiveHoverable = hoverable;

  state.tooltipWasJustHidden = false;

  dispatchInternalEvent(event, 'whenTooltipShows', {
    tooltip,
  });

  return true;
}

export function peekTooltipClientRect(tooltip) {
  const oldDisplayStyle = cssProp(tooltip, 'display');
  cssProp(tooltip, 'display', 'block');

  // Tooltips have a bit of padding that makes the interactive
  // area wider, so that you're less likely to accidentally let
  // the tooltip disappear (by hovering outside it). But this
  // isn't visual at all, so for placement we only care about
  // the content element.
  const content =
    tooltip.querySelector('.tooltip-content');

  try {
    return WikiRect.fromElement(content);
  } finally {
    cssProp(tooltip, 'display', oldDisplayStyle);
  }
}

export function repositionCurrentTooltip() {
  const {state} = info;
  const {currentlyActiveHoverable} = state;

  if (!currentlyActiveHoverable) {
    throw new Error(`No hoverable active to reposition tooltip from`);
  }

  positionTooltipFromHoverableWithBrains(currentlyActiveHoverable);
}

export function positionTooltipFromHoverableWithBrains(hoverable) {
  const {state} = info;
  const {tooltip} = state.registeredHoverables.get(hoverable);

  const anchorDirection = state.dynamicTooltipAnchorDirection;

  // Reset before doing anything else. We're going to adapt to
  // its natural placement, adjusted by CSS, which otherwise
  // could be obscured by a placement we've previously provided.
  resetDynamicTooltipPositioning(tooltip);

  const opportunities =
    getTooltipFromHoverablePlacementOpportunityAreas(hoverable);

  const tooltipRect =
    peekTooltipClientRect(tooltip);

  // If the tooltip is already in the baseline containing area,
  // prefer to keep it positioned naturally, adjusted by CSS
  // instead of JavaScript.

  const {numBaselineRects, idealBaseline: baselineRect} = opportunities;

  if (baselineRect.contains(tooltipRect)) {
    return;
  }

  const tryDirection = (dir1, dir2, i) => {
    selectedRect = opportunities[dir1][dir2][i];
    return !!selectedRect;
  };

  let selectedRect = null;
  selectRect: {
    if (anchorDirection) {
      for (let i = 0; i < numBaselineRects; i++) {
        if (tryDirection(...anchorDirection, i)) {
          break selectRect;
        }
      }
    }

    for (let i = 0; i < numBaselineRects; i++) {
      for (const [dir1, dir2] of [
        ['right', 'down'],
        ['left', 'down'],
        ['right', 'up'],
        ['left', 'up'],
        ['down', 'right'],
        ['down', 'left'],
        ['up', 'right'],
        ['up', 'left'],
      ]) {
        if (tryDirection(dir1, dir2, i)) {
          state.dynamicTooltipAnchorDirection = [dir1, dir2];
          break selectRect;
        }
      }
    }

    selectedRect = baselineRect;
  }

  positionTooltip(tooltip, selectedRect.x, selectedRect.y);
}

export function positionTooltip(tooltip, x, y) {
  // Imagine what it'd be like if the tooltip were positioned
  // with zero left/top offset, and calculate its actual offsets
  // based on that.

  cssProp(tooltip, {
    left: `0`,
    top: `0`,
  });

  const tooltipRect =
    peekTooltipClientRect(tooltip);

  cssProp(tooltip, {
    left: `${x - tooltipRect.x}px`,
    top: `${y - tooltipRect.y}px`,
  });
}

export function resetDynamicTooltipPositioning(tooltip) {
  cssProp(tooltip, {
    left: null,
    top: null,
  });
}

export function getTooltipFromHoverablePlacementOpportunityAreas(hoverable) {
  const {state} = info;
  const {tooltip} = state.registeredHoverables.get(hoverable);

  const baselineRects =
    getTooltipBaselineOpportunityAreas(tooltip);

  const hoverableRect =
    WikiRect.fromElementUnderMouse(hoverable).toExtended(5, 10);

  const tooltipRect =
    peekTooltipClientRect(tooltip);

  // Get placements relative to the hoverable. Make these available by key,
  // allowing the caller to choose by preferred orientation. Each value is
  // an array which corresponds to the baseline areas - placement closer to
  // front of the array indicates stronger preference. Since not all relative
  // placements cooperate with all baseline areas, any of these arrays may
  // include (or be entirely made of) null.

  const keepIfFits = (rect) =>
    (rect?.fits(tooltipRect)
      ? rect
      : null);

  const prepareRegionRects = (relationalRect, direct) =>
    baselineRects
      .map(rect => rect.intersectionWith(relationalRect))
      .map(direct)
      .map(keepIfFits);

  const regionRects = {
    left:
      prepareRegionRects(
        WikiRect.leftOf(hoverableRect),
        rect => WikiRect.fromRect({
          x: rect.right,
          y: rect.y,
          width: -rect.width,
          height: rect.height,
        })),

    right:
      prepareRegionRects(
        WikiRect.rightOf(hoverableRect),
        rect => rect),

    top:
      prepareRegionRects(
        WikiRect.above(hoverableRect),
        rect => WikiRect.fromRect({
          x: rect.x,
          y: rect.bottom,
          width: rect.width,
          height: -rect.height,
        })),

    bottom:
      prepareRegionRects(
        WikiRect.beneath(hoverableRect),
        rect => rect),
  };

  const neededVerticalOverlap = 30;
  const neededHorizontalOverlap = 30;

  const upTopDown =
    WikiRect.beneath(
      hoverableRect.top + neededVerticalOverlap - tooltipRect.height);

  const downBottomUp =
    WikiRect.above(
      hoverableRect.bottom - neededVerticalOverlap + tooltipRect.height);

  // Please don't ask us to make this but horizontal?
  const prepareVerticalOrientationRects = (regionRects) => {
    const orientations = {};

    const orientHorizontally = (rect, i) => {
      if (!rect) return null;

      const regionRect = regionRects[i];
      if (regionRect.width > 0) {
        return rect;
      } else {
        return WikiRect.fromRect({
          x: regionRect.right - tooltipRect.width,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        });
      }
    };

    orientations.up =
      regionRects
        .map(rect => rect?.intersectionWith(upTopDown))
        .map(orientHorizontally)
        .map(keepIfFits);

    orientations.down =
      regionRects
        .map(rect => rect?.intersectionWith(downBottomUp))
        .map(rect =>
          (rect
            ? rect.intersectionWith(WikiRect.fromRect({
                x: rect.x,
                y: rect.bottom - tooltipRect.height,
                width: rect.width,
                height: tooltipRect.height,
              }))
            : null))
        .map(orientHorizontally)
        .map(keepIfFits);

    const centerRect =
      WikiRect.fromRect({
        x: -Infinity, width: Infinity,
        y: hoverableRect.top
         + hoverableRect.height / 2
         - tooltipRect.height / 2,
        height: tooltipRect.height,
      });

    orientations.center =
      regionRects
        .map(rect => rect?.intersectionWith(centerRect))
        .map(orientHorizontally)
        .map(keepIfFits);

    return orientations;
  };

  const rightRightLeft =
    WikiRect.leftOf(
      hoverableRect.left - neededHorizontalOverlap + tooltipRect.width);

  const leftLeftRight =
    WikiRect.rightOf(
      hoverableRect.left + neededHorizontalOverlap - tooltipRect.width);

  // Oops.
  const prepareHorizontalOrientationRects = (regionRects) => {
    const orientations = {};

    const orientVertically = (rect, i) => {
      if (!rect) return null;

      const regionRect = regionRects[i];

      if (regionRect.height > 0) {
        return rect;
      } else {
        return WikiRect.fromRect({
          x: rect.x,
          y: regionRect.bottom - tooltipRect.height,
          width: rect.width,
          height: rect.height,
        });
      }
    };

    orientations.left =
      regionRects
        .map(rect => rect?.intersectionWith(leftLeftRight))
        .map(orientVertically)
        .map(keepIfFits);

    orientations.right =
      regionRects
        .map(rect => rect?.intersectionWith(rightRightLeft))
        .map(rect =>
          (rect
            ? rect.intersectionWith(WikiRect.fromRect({
                x: rect.right - tooltipRect.width,
                y: rect.y,
                width: rect.width,
                height: tooltipRect.height,
              }))
            : null))
        .map(orientVertically)
        .map(keepIfFits);

    // No analogous center because we don't actually use
    // center alignment...

    return orientations;
  };

  const orientationRects = {
    left: prepareVerticalOrientationRects(regionRects.left),
    right: prepareVerticalOrientationRects(regionRects.right),
    down: prepareHorizontalOrientationRects(regionRects.bottom),
    up: prepareHorizontalOrientationRects(regionRects.top),
  };

  return {
    numBaselineRects: baselineRects.length,
    idealBaseline: baselineRects[0],
    ...orientationRects,
  };
}

export function getTooltipBaselineOpportunityAreas(tooltip) {
  // Returns multiple basic areas in order of preference, with front of the
  // array representing greater preference.

  const {stickyContainers} = stickyHeadingInfo;
  const results = [];

  const windowRect =
    WikiRect.fromWindow().toInset(10);

  const workingRect =
    WikiRect.fromRect(windowRect);

  const tooltipRect =
    peekTooltipClientRect(tooltip);

  // As a baseline, always treat the window rect as fitting the tooltip.
  results.unshift(WikiRect.fromRect(workingRect));

  const containingParent =
    getVisuallyContainingElement(tooltip);

  if (containingParent) {
    const containingRect =
      WikiRect.fromElement(containingParent);

    // Only respect a portion of the container's padding, giving
    // the tooltip the impression of a "raised" element.
    const padding = side =>
      0.5 *
      parseFloat(cssProp(containingParent, 'padding-' + side));

    const insetContainingRect =
      containingRect.toInset({
        left: padding('left'),
        right: padding('right'),
        top: padding('top'),
        bottom: padding('bottom'),
      });

    workingRect.chopExtendingOutside(insetContainingRect);

    if (!workingRect.fits(tooltipRect)) {
      return results;
    }

    results.unshift(WikiRect.fromRect(workingRect));
  }

  // This currently assumes a maximum of one sticky container
  // per visually containing element.

  const stickyContainer =
    stickyContainers
      .find(el => el.parentElement === containingParent);

  if (stickyContainer) {
    const stickyRect =
      stickyContainer.getBoundingClientRect()

    // Add some padding so the tooltip doesn't line up exactly
    // with the edge of the sticky container.
    const beneathStickyContainer =
      WikiRect.beneath(stickyRect, 10);

    workingRect.chopExtendingOutside(beneathStickyContainer);

    if (!workingRect.fits(tooltipRect)) {
      return results;
    }

    results.unshift(WikiRect.fromRect(workingRect));
  }

  return results;
}

export function addPageListeners() {
  const {state} = info;

  const getTouchIdentifiers = domEvent =>
    Array.from(domEvent.changedTouches)
      .map(touch => touch.identifier)
      .filter(identifier => typeof identifier !== 'undefined');

  document.body.addEventListener('touchstart', domEvent => {
    for (const identifier of getTouchIdentifiers(domEvent)) {
      state.currentTouchIdentifiers.add(identifier);
    }
  });

  window.addEventListener('scroll', () => {
    for (const identifier of state.currentTouchIdentifiers) {
      state.touchIdentifiersBanishedByScrolling.add(identifier);
    }
  });

  document.body.addEventListener('touchend', domEvent => {
    setTimeout(() => {
      for (const identifier of getTouchIdentifiers(domEvent)) {
        state.currentTouchIdentifiers.delete(identifier);
        state.touchIdentifiersBanishedByScrolling.delete(identifier);
      }
    });
  });

  const getHoverablesAndTooltips = () => [
    ...Array.from(state.registeredHoverables.keys()),
    ...Array.from(state.registeredTooltips.keys()),
  ];

  document.body.addEventListener('touchend', domEvent => {
    const touches = Array.from(domEvent.changedTouches);
    const identifiers = touches.map(touch => touch.identifier);

    // Don't process touch events that were "banished" because the page was
    // scrolled while those touches were active, and most likely as a result of
    // them.
    filterMultipleArrays(touches, identifiers,
      (_touch, identifier) =>
        !state.touchIdentifiersBanishedByScrolling.has(identifier));

    if (empty(touches)) return;

    const pointIsOverHoverableOrTooltip =
      pointIsOverAnyOf(getHoverablesAndTooltips());

    const anyTouchOverAnyHoverableOrTooltip =
      touches.some(({clientX, clientY}) =>
        pointIsOverHoverableOrTooltip(clientX, clientY));

    if (!anyTouchOverAnyHoverableOrTooltip) {
      hideCurrentlyShownTooltip();
    }
  });

  document.body.addEventListener('click', domEvent => {
    const {clientX, clientY} = domEvent;

    const pointIsOverHoverableOrTooltip =
      pointIsOverAnyOf(getHoverablesAndTooltips());

    if (!pointIsOverHoverableOrTooltip(clientX, clientY)) {
      // Hide with "intent to replace" - we aren't actually going to replace
      // the tooltip with a new one, but this intent indicates that it should
      // be hidden right away, instead of showing. What we're really replacing,
      // or rather removing, is the state of interacting with tooltips at all.
      hideCurrentlyShownTooltip(true);

      // Part of that state is fast hovering, which should be canceled out.
      state.fastHovering = false;
      if (state.endFastHoveringTimeout) {
        clearTimeout(state.endFastHoveringTimeout);
        state.endFastHoveringTimeout = null;
      }

      // Also cancel out of transitioning a tooltip hidden - this isn't caught
      // by `hideCurrentlyShownTooltip` because a transitioning-hidden tooltip
      // doesn't count as "shown" anymore.
      cancelTransitioningTooltipHidden();
    }
  });
}
