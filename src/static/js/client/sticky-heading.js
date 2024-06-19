/* eslint-env browser */

import {filterMultipleArrays, stitchArrays} from '../../shared-util/sugar.js';
import {dispatchInternalEvent, templateContent} from '../client-util.js';

export const info = {
  id: 'stickyHeadingInfo',

  stickyContainers: null,

  stickySubheadingRows: null,
  stickySubheadings: null,

  stickyCoverContainers: null,
  stickyCoverTextAreas: null,
  stickyCovers: null,

  contentContainers: null,
  contentHeadings: null,
  contentCovers: null,
  contentCoversReveal: null,

  state: {
    displayedHeading: null,
  },

  event: {
    whenDisplayedHeadingChanges: [],
  },
};

export function getPageReferences() {
  info.stickyContainers =
    Array.from(document.getElementsByClassName('content-sticky-heading-container'));

  info.stickyCoverContainers =
    info.stickyContainers
      .map(el => el.querySelector('.content-sticky-heading-cover-container'));

  info.stickyCovers =
    info.stickyCoverContainers
      .map(el => el?.querySelector('.content-sticky-heading-cover'));

  info.stickyCoverTextAreas =
    info.stickyCovers
      .map(el => el?.querySelector('.image-text-area'));

  info.stickySubheadingRows =
    info.stickyContainers
      .map(el => el.querySelector('.content-sticky-subheading-row'));

  info.stickySubheadings =
    info.stickySubheadingRows
      .map(el => el.querySelector('h2'));

  info.contentContainers =
    info.stickyContainers
      .map(el => el.parentElement);

  info.contentCovers =
    info.contentContainers
      .map(el => el.querySelector('#cover-art-container'));

  info.contentCoversReveal =
    info.contentCovers
      .map(el => el ? !!el.querySelector('.reveal') : null);

  info.contentHeadings =
    info.contentContainers
      .map(el => Array.from(el.querySelectorAll('.content-heading')));
}

export function mutatePageContent() {
  removeTextPlaceholderStickyHeadingCovers();
  addRevealClassToStickyHeadingCovers();
}

function removeTextPlaceholderStickyHeadingCovers() {
  const hasTextArea =
    info.stickyCoverTextAreas.map(el => !!el);

  const coverContainersWithTextArea =
    info.stickyCoverContainers
      .filter((_el, index) => hasTextArea[index]);

  for (const el of coverContainersWithTextArea) {
    el.remove();
  }

  info.stickyCoverContainers =
    info.stickyCoverContainers
      .map((el, index) => hasTextArea[index] ? null : el);

  info.stickyCovers =
    info.stickyCovers
      .map((el, index) => hasTextArea[index] ? null : el);

  info.stickyCoverTextAreas =
    info.stickyCoverTextAreas
      .slice()
      .fill(null);
}

function addRevealClassToStickyHeadingCovers() {
  const stickyCoversWhichReveal =
    info.stickyCovers
      .filter((_el, index) => info.contentCoversReveal[index]);

  for (const el of stickyCoversWhichReveal) {
    el.classList.add('content-sticky-heading-cover-needs-reveal');
  }
}

function addRevealListenersForStickyHeadingCovers() {
  const stickyCovers = info.stickyCovers.slice();
  const contentCovers = info.contentCovers.slice();

  filterMultipleArrays(
    stickyCovers,
    contentCovers,
    (_stickyCover, _contentCover, index) => info.contentCoversReveal[index]);

  for (const {stickyCover, contentCover} of stitchArrays({
    stickyCover: stickyCovers,
    contentCover: contentCovers,
  })) {
    // TODO: Janky - should use internal event instead of DOM event
    contentCover.querySelector('.reveal').addEventListener('hsmusic-reveal', () => {
      stickyCover.classList.remove('content-sticky-heading-cover-needs-reveal');
    });
  }
}

function topOfViewInside(el, scroll = window.scrollY) {
  return (
    scroll > el.offsetTop &&
    scroll < el.offsetTop + el.offsetHeight);
}

function updateStickyCoverVisibility(index) {
  const stickyCoverContainer = info.stickyCoverContainers[index];
  const contentCover = info.contentCovers[index];

  if (contentCover && stickyCoverContainer) {
    if (contentCover.getBoundingClientRect().bottom < 4) {
      stickyCoverContainer.classList.add('visible');
    } else {
      stickyCoverContainer.classList.remove('visible');
    }
  }
}

function getContentHeadingClosestToStickySubheading(index) {
  const contentContainer = info.contentContainers[index];

  if (!topOfViewInside(contentContainer)) {
    return null;
  }

  const stickySubheading = info.stickySubheadings[index];

  if (stickySubheading.childNodes.length === 0) {
    // Supply a non-breaking space to ensure correct basic line height.
    stickySubheading.appendChild(document.createTextNode('\xA0'));
  }

  const stickyContainer = info.stickyContainers[index];
  const stickyRect = stickyContainer.getBoundingClientRect();

  // TODO: Should this compute with the subheading row instead of h2?
  const subheadingRect = stickySubheading.getBoundingClientRect();

  const stickyBottom = stickyRect.bottom + subheadingRect.height;

  // Iterate from bottom to top of the content area.
  const contentHeadings = info.contentHeadings[index];
  for (const heading of contentHeadings.slice().reverse()) {
    const headingRect = heading.getBoundingClientRect();
    if (headingRect.y + headingRect.height / 1.5 < stickyBottom + 20) {
      return heading;
    }
  }

  return null;
}

function updateStickySubheadingContent(index) {
  const {event, state} = info;

  const closestHeading = getContentHeadingClosestToStickySubheading(index);

  if (state.displayedHeading === closestHeading) return;

  const stickySubheadingRow = info.stickySubheadingRows[index];

  if (closestHeading) {
    const stickySubheading = info.stickySubheadings[index];

    // Array.from needed to iterate over a live array with for..of
    for (const child of Array.from(stickySubheading.childNodes)) {
      child.remove();
    }

    const textContainer =
      templateContent(
        closestHeading.querySelector('.content-heading-sticky-title')) ??
      closestHeading.querySelector('.content-heading-main-title') ??
      closestHeading;

    for (const child of textContainer.childNodes) {
      if (child.tagName === 'A') {
        for (const grandchild of child.childNodes) {
          stickySubheading.appendChild(grandchild.cloneNode(true));
        }
      } else {
        stickySubheading.appendChild(child.cloneNode(true));
      }
    }

    stickySubheadingRow.classList.add('visible');
  } else {
    stickySubheadingRow.classList.remove('visible');
  }

  const oldDisplayedHeading = state.displayedHeading;

  state.displayedHeading = closestHeading;

  dispatchInternalEvent(event, 'whenDisplayedHeadingChanges', index, {
    oldHeading: oldDisplayedHeading,
    newHeading: closestHeading,
  });
}

export function updateStickyHeadings(index) {
  updateStickyCoverVisibility(index);
  updateStickySubheadingContent(index);
}

export function initializeState() {
  for (let i = 0; i < info.stickyContainers.length; i++) {
    updateStickyHeadings(i);
  }
}

export function addPageListeners() {
  addRevealListenersForStickyHeadingCovers();
  addScrollListenerForStickyHeadings();
}

function addScrollListenerForStickyHeadings() {
  document.addEventListener('scroll', () => {
    for (let i = 0; i < info.stickyContainers.length; i++) {
      updateStickyHeadings(i);
    }
  });
}
