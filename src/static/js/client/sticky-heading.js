import {filterMultipleArrays, stitchArrays} from '../../shared-util/sugar.js';
import {cssProp, dispatchInternalEvent, templateContent}
  from '../client-util.js';

export const info = {
  id: 'stickyHeadingInfo',

  stickyRoots: null,

  stickyContainers: null,
  staticContainers: null,

  stickyHeadingRows: null,
  stickyHeadings: null,
  stickySubheadingRows: null,
  stickySubheadings: null,

  stickyCoverContainers: null,
  stickyCoverTextAreas: null,
  stickyCovers: null,

  contentContainers: null,
  contentHeadings: null,
  contentCoverColumns: null,
  contentCovers: null,
  contentCoversReveal: null,

  referenceCollapsedHeading: null,

  state: {
    displayedHeading: null,
  },

  event: {
    whenDisplayedHeadingChanges: [],
    whenStuckStatusChanges: [],
  },
};

export function getPageReferences() {
  info.stickyRoots =
    Array.from(document.querySelectorAll('.content-sticky-heading-root:not([inert])'));

  info.stickyContainers =
    info.stickyRoots
      .map(el => el.querySelector('.content-sticky-heading-container'));

  info.staticContainers =
    info.stickyRoots
      .map(el => el.nextElementSibling);

  info.stickyCoverContainers =
    info.stickyContainers
      .map(el => el.querySelector('.content-sticky-heading-cover-container'));

  info.stickyCovers =
    info.stickyCoverContainers
      .map(el => el?.querySelector('.content-sticky-heading-cover'));

  info.stickyCoverTextAreas =
    info.stickyCovers
      .map(el => el?.querySelector('.image-text-area'));

  info.stickyHeadingRows =
    info.stickyContainers
      .map(el => el.querySelector('.content-sticky-heading-row'));

  info.stickyHeadings =
    info.stickyHeadingRows
      .map(el => el.querySelector('h1'));

  info.stickySubheadingRows =
    info.stickyContainers
      .map(el => el.querySelector('.content-sticky-subheading-row'));

  info.stickySubheadings =
    info.stickySubheadingRows
      .map(el => el.querySelector('h2'));

  info.contentContainers =
    info.stickyContainers
      .map(el => el.closest('.content-sticky-heading-root').parentElement);

  info.contentCoverColumns =
    info.contentContainers
      .map(el => el.querySelector('#artwork-column'));

  info.contentCovers =
    info.contentCoverColumns
      .map(el => el ? el.querySelector('.cover-artwork') : null);

  info.contentCoversReveal =
    info.contentCovers
      .map(el => el ? !!el.querySelector('.reveal') : null);

  info.contentHeadings =
    info.contentContainers
      .map(el => Array.from(el.querySelectorAll('.content-heading')));

  info.referenceCollapsedHeading =
    info.stickyHeadings
      .map(el => el.querySelector('.reference-collapsed-heading'));
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

function updateStuckStatus(index) {
  const {event} = info;

  const contentContainer = info.contentContainers[index];
  const stickyContainer = info.stickyContainers[index];

  const wasStuck = stickyContainer.classList.contains('stuck');
  const stuck = topOfViewInside(contentContainer);

  if (stuck === wasStuck) return;

  if (stuck) {
    stickyContainer.classList.add('stuck');
  } else {
    stickyContainer.classList.remove('stuck');
  }

  dispatchInternalEvent(event, 'whenStuckStatusChanges', index, stuck);
}

function updateCollapseStatus(index) {
  const stickyContainer = info.stickyContainers[index];
  const staticContainer = info.staticContainers[index];
  const stickyHeading = info.stickyHeadings[index];
  const referenceCollapsedHeading = info.referenceCollapsedHeading[index];

  const {height: uncollapsedHeight} = stickyHeading.getBoundingClientRect();
  const {height: collapsedHeight} = referenceCollapsedHeading.getBoundingClientRect();

  if (
    staticContainer.getBoundingClientRect().bottom < 4 ||
    staticContainer.getBoundingClientRect().top < -80
  ) {
    if (!stickyContainer.classList.contains('collapse')) {
      stickyContainer.classList.add('collapse');
      cssProp(stickyContainer, '--uncollapsed-heading-height', uncollapsedHeight + 'px');
      cssProp(stickyContainer, '--collapsed-heading-height', collapsedHeight + 'px');
    }
  } else {
    stickyContainer.classList.remove('collapse');
  }
}

function updateStickyCoverVisibility(index) {
  const stickyCoverContainer = info.stickyCoverContainers[index];
  const stickyContainer = info.stickyContainers[index];
  const contentCoverColumn = info.contentCoverColumns[index];

  if (contentCoverColumn && stickyCoverContainer) {
    if (contentCoverColumn.getBoundingClientRect().bottom < 4) {
      stickyCoverContainer.classList.add('visible');
      stickyContainer.classList.add('cover-visible');
    } else {
      stickyCoverContainer.classList.remove('visible');
      stickyContainer.classList.remove('cover-visible');
    }
  }
}

function getContentHeadingClosestToStickySubheading(index) {
  const contentContainer = info.contentContainers[index];

  if (!topOfViewInside(contentContainer)) {
    return null;
  }

  const stickyHeadingRow = info.stickyHeadingRows[index];
  const stickyRect = stickyHeadingRow.getBoundingClientRect();

  // Subheadings only appear when the sticky heading is collapsed,
  // so the used bottom edge should always be *as though* it's only
  // displaying one line of text. Subtract the current discrepancy.
  const stickyHeading = info.stickyHeadings[index];
  const referenceCollapsedHeading = info.referenceCollapsedHeading[index];
  const correctBottomEdge =
    stickyHeading.getBoundingClientRect().height -
    referenceCollapsedHeading.getBoundingClientRect().height;

  const stickyBottom =
    (stickyRect.bottom
   - correctBottomEdge);

  // Iterate from bottom to top of the content area.
  const contentHeadings = info.contentHeadings[index];
  for (const heading of contentHeadings.toReversed()) {
    if (heading.nodeName === 'SUMMARY' && !heading.closest('details').open) {
      continue;
    }

    const headingRect = heading.getBoundingClientRect();
    if (headingRect.y + headingRect.height / 1.5 < stickyBottom + 40) {
      return heading;
    }
  }

  return null;
}

function updateStickySubheadingContent(index) {
  const {event, state} = info;

  const stickyContainer = info.stickyContainers[index];

  const closestHeading =
    (stickyContainer.classList.contains('collapse')
      ? getContentHeadingClosestToStickySubheading(index)
      : null);

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
  updateStuckStatus(index);
  updateCollapseStatus(index);
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
