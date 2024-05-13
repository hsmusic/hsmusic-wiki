/* eslint-env browser */

// This is the JS file that gets loaded on the client! It's only really used for
// the random track feature right now - the idea is we only use it for stuff
// that cannot 8e done at static-site compile time, 8y its fundamentally
// ephemeral nature.

import {getColors} from '../shared-util/colors.js';

import {
  accumulateSum,
  atOffset,
  empty,
  filterMultipleArrays,
  promiseWithResolvers,
  stitchArrays,
  withEntries,
} from '../shared-util/sugar.js';

import {fetchWithProgress} from './xhr-util.js';

const clientInfo = window.hsmusicClientInfo = Object.create(null);

const clientSteps = {
  getPageReferences: [],
  addInternalListeners: [],
  mutatePageContent: [],
  initializeState: [],
  addPageListeners: [],
};

function initInfo(infoKey, description) {
  const object = {...description};

  for (const obj of [
    object,
    object.state,
    object.setting,
    object.event,
  ]) {
    if (!obj) continue;
    Object.preventExtensions(obj);
  }

  if (object.session) {
    const sessionDefaults = object.session;

    object.session = {};

    for (const [key, defaultValue] of Object.entries(sessionDefaults)) {
      const storageKey = `hsmusic.${infoKey}.${key}`;

      let fallbackValue = defaultValue;

      Object.defineProperty(object.session, key, {
        get: () => {
          try {
            return sessionStorage.getItem(storageKey) ?? defaultValue;
          } catch (error) {
            if (error instanceof DOMException) {
              return fallbackValue;
            } else {
              throw error;
            }
          }
        },

        set: (value) => {
          try {
            sessionStorage.setItem(storageKey, value);
          } catch (error) {
            if (error instanceof DOMException) {
              fallbackValue = value;
            } else {
              throw error;
            }
          }
        },
      });
    }

    Object.preventExtensions(object.session);
  }

  clientInfo[infoKey] = object;

  return object;
}

// Localiz8tion nonsense ----------------------------------

/*
const language = document.documentElement.getAttribute('lang');

let list;
if (typeof Intl === 'object' && typeof Intl.ListFormat === 'function') {
  const getFormat = (type) => {
    const formatter = new Intl.ListFormat(language, {type});
    return formatter.format.bind(formatter);
  };

  list = {
    conjunction: getFormat('conjunction'),
    disjunction: getFormat('disjunction'),
    unit: getFormat('unit'),
  };
} else {
  // Not a gr8 mock we've got going here, 8ut it's *mostly* language-free.
  // We use the same mock for every list 'cuz we don't have any of the
  // necessary CLDR info to appropri8tely distinguish 8etween them.
  const arbitraryMock = (array) => array.join(', ');

  list = {
    conjunction: arbitraryMock,
    disjunction: arbitraryMock,
    unit: arbitraryMock,
  };
}
*/

// Miscellaneous helpers ----------------------------------

function rebase(href, rebaseKey = 'rebaseLocalized') {
  const relative = (document.documentElement.dataset[rebaseKey] || '.') + '/';
  if (relative) {
    return relative + href;
  } else {
    return href;
  }
}

function pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function cssProp(el, ...args) {
  if (typeof args[0] === 'string' && args.length === 1) {
    return getComputedStyle(el).getPropertyValue(args[0]).trim();
  }

  if (typeof args[0] === 'string' && args.length === 2) {
    if (args[1] === null) {
      el.style.removeProperty(args[0]);
    } else {
      el.style.setProperty(args[0], args[1]);
    }
    return;
  }

  if (typeof args[0] === 'object') {
    for (const [property, value] of Object.entries(args[0])) {
      cssProp(el, property, value);
    }
  }
}

function templateContent(el) {
  if (el?.nodeName !== 'TEMPLATE') {
    throw new Error(`Expected a <template> element`);
  }

  return el.content.cloneNode(true);
}

// Curry-style, so multiple points can more conveniently be tested at once.
function pointIsOverAnyOf(elements) {
  return (clientX, clientY) => {
    const element = document.elementFromPoint(clientX, clientY);
    return elements.some(el => el.contains(element));
  };
}

function getVisuallyContainingElement(child) {
  let parent = child.parentElement;

  while (parent) {
    if (
      cssProp(parent, 'overflow') === 'hidden' ||
      cssProp(parent, 'contain') === 'paint'
    ) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return null;
}

// TODO: These should pro8a8ly access some shared urlSpec path. We'd need to
// separ8te the tooling around that into common-shared code too.

/*
const getLinkHref = (type, directory) => rebase(`${type}/${directory}`);
*/

const openAlbum = d => rebase(`album/${d}`);
const openArtist = d => rebase(`artist/${d}`);
const openFlash = d => rebase(`flash/${d}`);
const openTrack = d => rebase(`track/${d}`);

// TODO: This should also use urlSpec.

/*
function fetchData(type, directory) {
  return fetch(rebase(`${type}/${directory}/data.json`, 'rebaseData')).then(
    (res) => res.json()
  );
}
*/

function dispatchInternalEvent(event, eventName, ...args) {
  const [infoName] =
    Object.entries(clientInfo)
      .find(pair => pair[1].event === event);

  if (!infoName) {
    throw new Error(`Expected event to be stored on clientInfo`);
  }

  const {[eventName]: listeners} = event;

  if (!listeners) {
    throw new Error(`Event name "${eventName}" isn't stored on ${infoName}.event`);
  }

  let results = [];
  for (const listener of listeners) {
    try {
      results.push(listener(...args));
    } catch (error) {
      console.warn(`Uncaught error in listener for ${infoName}.${eventName}`);
      console.debug(error);
      results.push(undefined);
    }
  }

  return results;
}

// Rectangle math -----------------------------------------

class WikiRect extends DOMRect {
  // Useful constructors

  static fromWindow() {
    const {clientWidth: width, clientHeight: height} =
      document.documentElement;

    return Reflect.construct(this, [0, 0, width, height]);
  }

  static fromElement(element) {
    return this.fromRect(element.getBoundingClientRect());
  }

  static fromMouse() {
    const {clientX, clientY} = liveMousePositionInfo.state;

    return WikiRect.fromRect({
      x: clientX,
      y: clientY,
      width: 0,
      height: 0,
    });
  }

  static fromElementUnderMouse(element) {
    const mouseRect = WikiRect.fromMouse();

    const rects =
      Array.from(element.getClientRects())
        .map(rect => WikiRect.fromRect(rect));

    const rectUnderMouse =
      rects.find(rect => rect.contains(mouseRect));

    if (rectUnderMouse) {
      return rectUnderMouse;
    } else {
      return rects[0];
    }
  }

  static leftOf(origin, offset = 0) {
    // Returns a rectangle representing everywhere to the left of the provided
    // point or rectangle (with no top or bottom bounds), towards negative x.
    // If an offset is provided, this is added onto the origin.

    return this.#past(origin, offset, {
      origin: 'x',
      extent: 'width',
      edge: 'left',
      direction: -Infinity,
      construct: from =>
        [from, -Infinity, -Infinity, Infinity],
    });
  }

  static rightOf(origin, offset = 0) {
    // Returns a rectangle representing everywhere to the right of the
    // provided point or rectangle (with no top or bottom bounds), towards
    // positive x. If an offset is provided, this is added onto the origin.

    return this.#past(origin, offset, {
      origin: 'x',
      extent: 'width',
      edge: 'right',
      direction: Infinity,
      construct: from =>
        [from, -Infinity, Infinity, Infinity],
    });
  }

  static above(origin, offset = 0) {
    // Returns a rectangle representing everywhere above the provided point
    // or rectangle (with no left or right bounds), towards negative y.
    // If an offset is provided, this is added onto the origin.

    return this.#past(origin, offset, {
      origin: 'y',
      extent: 'height',
      edge: 'top',
      direction: -Infinity,
      construct: from =>
        [-Infinity, from, Infinity, -Infinity],
    });
  }

  static beneath(origin, offset = 0) {
    // Returns a rectangle representing everywhere beneath the provided point
    // or rectangle (with no left or right bounds), towards positive y.
    // If an offset is provided, this is added onto the origin.

    return this.#past(origin, offset, {
      origin: 'y',
      extent: 'height',
      edge: 'bottom',
      direction: Infinity,
      construct: from =>
        [-Infinity, from, Infinity, Infinity],
    });
  }

  // Constructor helpers

  static #past(origin, offset, opts) {
    if (!isFinite(offset)) {
      throw new TypeError(`Didn't expect infinite offset`);
    }

    const {direction, edge} = opts;

    if (typeof origin === 'object') {
      const {origin: originProperty, extent: extentProperty} = opts;

      const normalized =
        WikiRect.fromRect(origin).toNormalized();

      if (normalized[extentProperty] === direction) {
        throw new TypeError(`Provided rectangle already extends to ${edge} edge`);
      }

      if (normalized[extentProperty] === -direction) {
        return this.#past(normalized[originProperty], offset, opts);
      }

      if (normalized.y === direction) {
        throw new TypeError(`Provided rectangle already starts at ${edge} edge`);
      }

      return this.#past(normalized[edge], offset, opts);
    }

    const {construct} = opts;

    if (origin === direction) {
      throw new TypeError(`Provided point is already at ${edge} edge`);
    }

    return Reflect.construct(this, construct(origin + offset)).toNormalized();
  }

  // Predicates

  static rejectInfiniteOriginNonZeroFiniteExtent({origin, extent}) {
    // Indicate that, in this context, it's meaningless to provide
    // a finite extent starting at an infinite origin and going towards
    // or away from zero (i.e. a rectangle along a cardinal edge).

    if (!isFinite(origin) && isFinite(extent) && extent !== 0) {
      throw new TypeError(`Didn't expect infinite origin paired with finite extent`);
    }
  }

  static rejectInfiniteOriginZeroExtent({origin, extent}) {
    // Indicate that, in this context, it's meaningless to provide
    // a zero extent at an infinite origin (i.e. a cardinal edge).

    if (!isFinite(origin) && extent === 0) {
      throw new TypeError(`Didn't expect infinite origin paired with zero extent`);
    }
  }

  static rejectNonOpposingInfiniteOriginInfiniteExtent({origin, extent}) {
    // Indicate that, in this context, it's meaningless to provide
    // an infinite extent going in the same direction as its infinite
    // origin (an area "infinitely past" a cardinal edge).

    if (!isFinite(origin) && origin === extent) {
      throw new TypeError(`Didn't expect non-opposing infinite origin and extent`);
    }
  }

  // Transformations

  static normalizeOriginExtent({origin, extent}) {
    // Varying behavior based on inputs:
    //
    //  - For finite origin and finite extent, flip the orientation
    //    (if necessary) so that extent is positive.
    //  - For finite origin and infinite extent (i.e. an origin up to
    //    a cardinal edge), leave as-is.
    //  - For infinite origin and infinite extent, flip the orientation
    //    (if necessary) so origin is negative and extent is positive.
    //  - For infinite origin and zero extent (i.e. a cardinal edge),
    //    leave as-is.
    //  - For all other cases, error.
    //

    this.rejectInfiniteOriginNonZeroFiniteExtent({origin, extent});
    this.rejectNonOpposingInfiniteOriginInfiniteExtent({origin, extent});

    if (isFinite(origin) && isFinite(extent) && extent < 0) {
      return {origin: origin + extent, extent: -extent};
    }

    if (!isFinite(origin) && !isFinite(extent)) {
      return {origin: -Infinity, extent: Infinity};
    }

    return {origin, extent};
  }

  toNormalized() {
    const {origin: newX, extent: newWidth} =
      WikiRect.normalizeOriginExtent({
        origin: this.x,
        extent: this.width,
      });

    const {origin: newY, extent: newHeight} =
      WikiRect.normalizeOriginExtent({
        origin: this.y,
        extent: this.height,
      });

    return Reflect.construct(this.constructor, [newX, newY, newWidth, newHeight]);
  }

  static intersectionFromOriginsExtents(...entries) {
    // An intersection is the common subsection across two or more regions.

    const [first, second, ...rest] = entries;

    if (entries.length >= 3) {
      return this.intersection(first, this.intersection(second, ...rest));
    }

    if (entries.length === 2) {
      if (first === null || second === null) {
        return null;
      }

      this.rejectInfiniteOriginZeroExtent(first);
      this.rejectInfiniteOriginZeroExtent(second);

      const {origin: origin1, extent: extent1} = this.normalizeOriginExtent(first);
      const {origin: origin2, extent: extent2} = this.normalizeOriginExtent(second);

      // After normalizing, *each* region will be one of these:
      //
      //  - Finite origin, finite extent
      //    (a standard region, bounded on both sides)
      //  - Finite origin, infinite extent
      //    (everything to one direction of a given origin)
      //  - Infinite origin, infinite extent
      //    (everything everywhere)
      //
      // So we need to handle any *combination* of these kinds of regions.

      // If either origin is infinite, that region represents everywhere,
      // so it'll never limit the region of the other.

      if (!isFinite(origin1)) {
        return {origin: origin2, extent: extent2};
      }

      if (!isFinite(origin2)) {
        return {origin: origin1, extent: extent1};
      }

      // If neither origin is infinite, both regions are bounded on at least
      // one side, and may limit the other accordingly. Find the minimum and
      // maximum points in each region, letting Infinity propagate through,
      // which represents no boundary in that direction.

      const minimum1 = Math.min(origin1, origin1 + extent1);
      const minimum2 = Math.min(origin2, origin2 + extent2);
      const maximum1 = Math.max(origin1, origin1 + extent1);
      const maximum2 = Math.max(origin2, origin2 + extent2);

      // Now get the maximum of the regions' minimums, and the minimum of the
      // regions' maximums. These are the limits of the new region; computing
      // with minimums and maximums in this way "polarizes" the limits, so we
      // can perform specific polarized math in the following steps.
      //
      // Infinity will also propagate here, but with some important
      // restricitons: only maxOfMinimums can be positive Infinity, and only
      // minOfMaximums can be negative Infinity; and if either is Infinity,
      // the other is not, since otherwise we'd be working with two everywhere
      // regions, and would've just returned an everywhere region above.

      const maxOfMinimums = Math.max(minimum1, minimum2);
      const minOfMaximums = Math.min(maximum1, maximum2);

      // Now check if the maximum of minimums is greater than the minimum of
      // maximums. If so, the regions don't have any overlap - one region
      // limits the overlap to end before the other region starts. This works
      // because we've polarized the limits above!

      if (maxOfMinimums > minOfMaximums) {
        return null;
      }

      // Otherwise there's at least some overlap, even if it's just one point
      // (i.e. one ends exactly where the other begins). We have to take care
      // of infinities in particular, now. As mentioned above, only one of the
      // points will be infinity (at most). So the origin is the non-infinite
      // point, and the extent is in the direction of the infinite point.

      if (minOfMaximums === -Infinity) {
        return {origin: maxOfMinimums, extent: -Infinity};
      }

      if (maxOfMinimums === Infinity) {
        return {origin: minOfMaximums, extent: Infinity};
      }

      // If neither point is infinity, we're working with two regions that are
      // both bounded on both sides, so the overlapping region is just the
      // region constrained by the limits above. Since these are polarized,
      // start from maxOfMinimums and extend to minOfMaximums, resulting in
      // a standard, already-normalized region.

      return {
        origin: maxOfMinimums,
        extent: minOfMaximums - maxOfMinimums,
      };
    }

    if (entries.length === 1) {
      return first;
    }

    throw new TypeError(`Expected at least one {origin, extent} entry`);
  }

  intersectionWith(rect) {
    const horizontalIntersection =
      WikiRect.intersectionFromOriginsExtents(
        {origin: this.x, extent: this.width},
        {origin: rect.x, extent: rect.width});

    const verticalIntersection =
      WikiRect.intersectionFromOriginsExtents(
        {origin: this.y, extent: this.height},
        {origin: rect.y, extent: rect.height});

    if (!horizontalIntersection) return null;
    if (!verticalIntersection) return null;

    const {origin: x, extent: width} = horizontalIntersection;
    const {origin: y, extent: height} = verticalIntersection;

    return Reflect.construct(this.constructor, [x, y, width, height]);
  }

  chopExtendingOutside(rect) {
    this.intersectionWith(rect).writeOnto(this);
  }

  static insetOriginExtent({origin, extent, start = 0, end = 0}) {
    const normalized =
      this.normalizeOriginExtent({origin, extent});

    // If this would crush the bounds past each other, just return
    // the halfway point.
    if (extent < start + end) {
      return {origin: origin + (start + end) / 2, extent: 0};
    }

    return {
      origin: normalized.origin + start,
      extent: normalized.extent - start - end,
    };
  }

  toInset(arg1, arg2) {
    if (typeof arg1 === 'number' && typeof arg2 === 'number') {
      return this.toInset({
        left: arg2,
        right: arg2,
        top: arg1,
        bottom: arg1,
      });
    } else if (typeof arg1 === 'number') {
      return this.toInset({
        left: arg1,
        right: arg1,
        top: arg1,
        bottom: arg1,
      });
    }

    const {top, left, bottom, right} = arg1;

    const {origin: x, extent: width} =
      WikiRect.insetOriginExtent({
        origin: this.x,
        extent: this.width,
        start: left,
        end: right,
      });

    const {origin: y, extent: height} =
      WikiRect.insetOriginExtent({
        origin: this.y,
        extent: this.height,
        start: top,
        end: bottom,
      });

    return Reflect.construct(this.constructor, [x, y, width, height]);
  }

  static extendOriginExtent({origin, extent, start = 0, end = 0}) {
    const normalized =
      this.normalizeOriginExtent({origin, extent});

    return {
      origin: normalized.origin - start,
      extent: normalized.extent + start + end,
    };
  }

  toExtended(arg1, arg2) {
    if (typeof arg1 === 'number' && typeof arg2 === 'number') {
      return this.toExtended({
        left: arg2,
        right: arg2,
        top: arg1,
        bottom: arg1,
      });
    } else if (typeof arg1 === 'number') {
      return this.toExtended({
        left: arg1,
        right: arg1,
        top: arg1,
        bottom: arg1,
      });
    }

    const {top, left, bottom, right} = arg1;

    const {origin: x, extent: width} =
      WikiRect.extendOriginExtent({
        origin: this.x,
        extent: this.width,
        start: left,
        end: right,
      });

    const {origin: y, extent: height} =
      WikiRect.extendOriginExtent({
        origin: this.y,
        extent: this.height,
        start: top,
        end: bottom,
      });

    return Reflect.construct(this.constructor, [x, y, width, height]);
  }

  // Comparisons

  equals(rect) {
    const rectNormalized = WikiRect.fromRect(rect).toNormalized();
    const thisNormalized = this.toNormalized();

    return (
      rectNormalized.x === thisNormalized.x &&
      rectNormalized.y === thisNormalized.y &&
      rectNormalized.width === thisNormalized.width &&
      rectNormalized.height === thisNormalized.height
    );
  }

  contains(rect) {
    return !!this.intersectionWith(rect)?.equals(rect);
  }

  containedWithin(rect) {
    return !!this.intersectionWith(rect)?.equals(this);
  }

  fits(rect) {
    const rectNormalized = WikiRect.fromRect(rect).toNormalized();
    const thisNormalized = this.toNormalized();

    return (
      (!isFinite(this.width) || rectNormalized.width <= thisNormalized.width) &&
      (!isFinite(this.height) || rectNormalized.height <= thisNormalized.height)
    );
  }

  fitsWithin(rect) {
    const rectNormalized = WikiRect.fromRect(rect).toNormalized();
    const thisNormalized = this.toNormalized();

    return (
      (!isFinite(rect.width) || thisNormalized.width <= rectNormalized.width) &&
      (!isFinite(rect.height) || thisNormalized.height <= rectNormalized.height)
    );
  }

  // Interfacing utilities

  static fromRect(rect) {
    return Reflect.construct(this, [rect.x, rect.y, rect.width, rect.height]);
  }

  writeOnto(destination) {
    Object.assign(destination, {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    });
  }
}

// CSS compatibility-assistant ----------------------------

const cssCompatibilityAssistantInfo = clientInfo.cssCompatibilityAssistantInfo = {
  coverArtContainer: null,
  coverArtImageDetails: null,
};

function getCSSCompatibilityAssistantInfoReferences() {
  const info = cssCompatibilityAssistantInfo;

  info.coverArtContainer =
    document.getElementById('cover-art-container');

  info.coverArtImageDetails =
    info.coverArtContainer?.querySelector('.image-details');
}

function mutateCSSCompatibilityContent() {
  const info = cssCompatibilityAssistantInfo;

  if (info.coverArtImageDetails) {
    info.coverArtContainer.classList.add('has-image-details');
  }
}

clientSteps.getPageReferences.push(getCSSCompatibilityAssistantInfoReferences);
clientSteps.mutatePageContent.push(mutateCSSCompatibilityContent);

// Ever-updating mouse position helper --------------------

const liveMousePositionInfo = initInfo('liveMousePositionInfo', {
  state: {
    clientX: null,
    clientY: null,
  },
});

function addLiveMousePositionPageListeners() {
  const info = liveMousePositionInfo;
  const {state} = info;

  document.body.addEventListener('mousemove', domEvent => {
    Object.assign(state, {
      clientX: domEvent.clientX,
      clientY: domEvent.clientY,
    });
  });
}

clientSteps.addPageListeners.push(addLiveMousePositionPageListeners);

// JS-based links -----------------------------------------

const scriptedLinkInfo = initInfo('scriptedLinkInfo', {
  randomLinks: null,
  revealLinks: null,
  revealContainers: null,

  nextNavLink: null,
  previousNavLink: null,
  randomNavLink: null,

  state: {
    albumDirectories: null,
    albumTrackDirectories: null,
    artistDirectories: null,
    artistNumContributions: null,
  },
});

function getScriptedLinkReferences() {
  scriptedLinkInfo.randomLinks =
    document.querySelectorAll('[data-random]');

  scriptedLinkInfo.revealLinks =
    document.querySelectorAll('.reveal .image-outer-area > *');

  scriptedLinkInfo.revealContainers =
    Array.from(scriptedLinkInfo.revealLinks)
      .map(link => link.closest('.reveal'));

  scriptedLinkInfo.nextNavLink =
    document.getElementById('next-button');

  scriptedLinkInfo.previousNavLink =
    document.getElementById('previous-button');

  scriptedLinkInfo.randomNavLink =
    document.getElementById('random-button');
}

function addRandomLinkListeners() {
  for (const a of scriptedLinkInfo.randomLinks ?? []) {
    a.addEventListener('click', domEvent => {
      handleRandomLinkClicked(a, domEvent);
    });
  }
}

function handleRandomLinkClicked(a, domEvent) {
  const href = determineRandomLinkHref(a);

  if (!href) {
    domEvent.preventDefault();
    return;
  }

  setTimeout(() => {
    a.href = '#'
  });

  a.href = href;
}

function determineRandomLinkHref(a) {
  const {state} = scriptedLinkInfo;

  const trackDirectoriesFromAlbumDirectories = albumDirectories =>
    albumDirectories
      .map(directory => state.albumDirectories.indexOf(directory))
      .map(index => state.albumTrackDirectories[index])
      .reduce((acc, trackDirectories) => acc.concat(trackDirectories, []));

  switch (a.dataset.random) {
    case 'album': {
      const {albumDirectories} = state;
      if (!albumDirectories) return null;

      return openAlbum(pick(albumDirectories));
    }

    case 'track': {
      const {albumDirectories} = state;
      if (!albumDirectories) return null;

      const trackDirectories =
        trackDirectoriesFromAlbumDirectories(
          albumDirectories);

      return openTrack(pick(trackDirectories));
    }

    case 'album-in-group-dl': {
      const albumLinks =
        Array.from(a
          .closest('dt')
          .nextElementSibling
          .querySelectorAll('li a'))

      const listAlbumDirectories =
        albumLinks
          .map(a => cssProp(a, '--album-directory'));

      return openAlbum(pick(listAlbumDirectories));
    }

    case 'track-in-group-dl': {
      const {albumDirectories} = state;
      if (!albumDirectories) return null;

      const albumLinks =
        Array.from(a
          .closest('dt')
          .nextElementSibling
          .querySelectorAll('li a'))

      const listAlbumDirectories =
        albumLinks
          .map(a => cssProp(a, '--album-directory'));

      const trackDirectories =
        trackDirectoriesFromAlbumDirectories(
          listAlbumDirectories);

      return openTrack(pick(trackDirectories));
    }

    case 'track-in-sidebar': {
      // Note that the container for track links may be <ol> or <ul>, and
      // they can't be identified by href, since links from one track to
      // another don't include "track" in the href.
      const trackLinks =
        Array.from(document
          .querySelector('.track-list-sidebar-box')
          .querySelectorAll('li a'));

      return pick(trackLinks).href;
    }

    case 'track-in-album': {
      const {albumDirectories, albumTrackDirectories} = state;
      if (!albumDirectories || !albumTrackDirectories) return null;

      const albumDirectory = cssProp(a, '--album-directory');
      const albumIndex = albumDirectories.indexOf(albumDirectory);
      const trackDirectories = albumTrackDirectories[albumIndex];

      return openTrack(pick(trackDirectories));
    }

    case 'artist': {
      const {artistDirectories} = state;
      if (!artistDirectories) return null;

      return openArtist(pick(artistDirectories));
    }

    case 'artist-more-than-one-contrib': {
      const {artistDirectories, artistNumContributions} = state;
      if (!artistDirectories || !artistNumContributions) return null;

      const filteredArtistDirectories =
        artistDirectories
          .filter((_artist, index) => artistNumContributions[index] > 1);

      return openArtist(pick(filteredArtistDirectories));
    }
  }
}

function mutateNavigationLinkContent() {
  const prependTitle = (el, prepend) =>
    el?.setAttribute('title',
      (el.hasAttribute('title')
        ? prepend + ' ' + el.getAttribute('title')
        : prepend));

  prependTitle(scriptedLinkInfo.nextNavLink, '(Shift+N)');
  prependTitle(scriptedLinkInfo.previousNavLink, '(Shift+P)');
  prependTitle(scriptedLinkInfo.randomNavLink, '(Shift+R)');
}

function addNavigationKeyPressListeners() {
  document.addEventListener('keypress', (event) => {
    if (event.shiftKey) {
      if (event.charCode === 'N'.charCodeAt(0)) {
        scriptedLinkInfo.nextNavLink?.click();
      } else if (event.charCode === 'P'.charCodeAt(0)) {
        scriptedLinkInfo.previousNavLink?.click();
      } else if (event.charCode === 'R'.charCodeAt(0)) {
        scriptedLinkInfo.randomNavLink?.click();
      }
    }
  });
}

function addRevealLinkClickListeners() {
  const info = scriptedLinkInfo;

  for (const {revealLink, revealContainer} of stitchArrays({
    revealLink: Array.from(info.revealLinks ?? []),
    revealContainer: Array.from(info.revealContainers ?? []),
  })) {
    revealLink.addEventListener('click', (event) => {
      handleRevealLinkClicked(event, revealLink, revealContainer);
    });
  }
}

function handleRevealLinkClicked(domEvent, _revealLink, revealContainer) {
  if (revealContainer.classList.contains('revealed')) {
    return;
  }

  domEvent.preventDefault();
  revealContainer.classList.add('revealed');
  revealContainer.dispatchEvent(new CustomEvent('hsmusic-reveal'));
}

clientSteps.getPageReferences.push(getScriptedLinkReferences);
clientSteps.addPageListeners.push(addRandomLinkListeners);
clientSteps.addPageListeners.push(addNavigationKeyPressListeners);
clientSteps.addPageListeners.push(addRevealLinkClickListeners);
clientSteps.mutatePageContent.push(mutateNavigationLinkContent);

if (
  document.documentElement.dataset.urlKey === 'localized.listing' &&
  document.documentElement.dataset.urlValue0 === 'random'
) {
  const dataLoadingLine = document.getElementById('data-loading-line');
  const dataLoadedLine = document.getElementById('data-loaded-line');
  const dataErrorLine = document.getElementById('data-error-line');

  dataLoadingLine.style.display = 'block';

  fetch(rebase('random-link-data.json', 'rebaseShared'))
    .then(data => data.json())
    .then(data => {
      const {state} = scriptedLinkInfo;

      Object.assign(state, {
        albumDirectories: data.albumDirectories,
        albumTrackDirectories: data.albumTrackDirectories,
        artistDirectories: data.artistDirectories,
        artistNumContributions: data.artistNumContributions,
      });

      dataLoadingLine.style.display = 'none';
      dataLoadedLine.style.display = 'block';
    }, () => {
      dataLoadingLine.style.display = 'none';
      dataErrorLine.style.display = 'block';
    })
    .then(() => {
      const {randomLinks} = scriptedLinkInfo;
      for (const a of randomLinks) {
        const href = determineRandomLinkHref(a);
        if (!href) {
          a.removeAttribute('href');
        }
      }
    });
}

// Links nested in summaries ------------------------------

const summaryNestedLinksInfo = initInfo('summaryNestedLinksInfo', {
  summaries: null,
  links: null,
});

function getSummaryNestedLinksReferences() {
  const info = summaryNestedLinksInfo;

  info.summaries =
    Array.from(document.getElementsByTagName('summary'));

  info.links =
    info.summaries
      .map(summary =>
        Array.from(summary.getElementsByTagName('a')));

  filterMultipleArrays(
    info.summaries,
    info.links,
    (_summary, links) => !empty(links));
}

function addSummaryNestedLinksPageListeners() {
  const info = summaryNestedLinksInfo;

  for (const {summary, links} of stitchArrays({
    summary: info.summaries,
    links: info.links,
  })) {
    for (const link of links) {
      link.addEventListener('mouseover', () => {
        link.classList.add('nested-hover');
        summary.classList.add('has-nested-hover');
      });

      link.addEventListener('mouseout', () => {
        link.classList.remove('nested-hover');
        summary.classList.remove('has-nested-hover');
      });
    }
  }
}

clientSteps.getPageReferences.push(getSummaryNestedLinksReferences);
clientSteps.getPageReferences.push(addSummaryNestedLinksPageListeners);

// Tooltip-style hover (infrastructure) -------------------

const hoverableTooltipInfo = initInfo('hoverableTooltipInfo', {
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
  },

  event: {
    whenTooltipShows: [],
    whenTooltipHides: [],
  },
});

// Adds DOM event listeners, so must be called during addPageListeners step.
function registerTooltipElement(tooltip) {
  const {state} = hoverableTooltipInfo;

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
function registerTooltipHoverableElement(hoverable, tooltip) {
  const {state} = hoverableTooltipInfo;

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
  const {state} = hoverableTooltipInfo;

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
  const {settings, state} = hoverableTooltipInfo;

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
  const {state} = hoverableTooltipInfo;

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
  const {settings, state} = hoverableTooltipInfo;
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
  const {settings, state} = hoverableTooltipInfo;

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
  const {settings, state} = hoverableTooltipInfo;

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
  const {state} = hoverableTooltipInfo;

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
  const {state} = hoverableTooltipInfo;
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
  const {state} = hoverableTooltipInfo;

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

function currentlyShownTooltipHasFocus(focusElement = document.activeElement) {
  const {state} = hoverableTooltipInfo;

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

function beginTransitioningTooltipHidden(tooltip) {
  const {settings, state} = hoverableTooltipInfo;

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

function cancelTransitioningTooltipHidden(andShow = false) {
  const {state} = hoverableTooltipInfo;

  endTransitioningTooltipHidden();

  if (andShow) {
    showTooltipFromHoverable(state.previouslyActiveHoverable);
  }
}

function endTransitioningTooltipHidden() {
  const {state} = hoverableTooltipInfo;
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

function hideCurrentlyShownTooltip(intendingToReplace = false) {
  const {settings, state, event} = hoverableTooltipInfo;
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

function showTooltipFromHoverable(hoverable) {
  const {state, event} = hoverableTooltipInfo;
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

function peekTooltipClientRect(tooltip) {
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

function positionTooltipFromHoverableWithBrains(hoverable) {
  const {state} = hoverableTooltipInfo;
  const {tooltip} = state.registeredHoverables.get(hoverable);

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

  let selectedRect = null;
  for (let i = 0; i < numBaselineRects; i++) {
    selectedRect = opportunities.right.down[i];
    if (selectedRect) break;

    selectedRect = opportunities.left.down[i];
    if (selectedRect) break;

    selectedRect = opportunities.right.up[i];
    if (selectedRect) break;

    selectedRect = opportunities.left.up[i];
    if (selectedRect) break;
  }

  selectedRect ??= baselineRect;

  positionTooltip(tooltip, selectedRect.x, selectedRect.y);
}

function positionTooltip(tooltip, x, y) {
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

function resetDynamicTooltipPositioning(tooltip) {
  cssProp(tooltip, {
    left: null,
    top: null,
  });
}

function getTooltipFromHoverablePlacementOpportunityAreas(hoverable) {
  const {state} = hoverableTooltipInfo;
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

  // Please don't ask us to make this but horizontal?
  const prepareVerticalOrientationRects = (regionRects) => {
    const orientations = {};

    const upTopDown =
      WikiRect.beneath(
        hoverableRect.top + neededVerticalOverlap - tooltipRect.height);

    const downBottomUp =
      WikiRect.above(
        hoverableRect.bottom - neededVerticalOverlap + tooltipRect.height);

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

  const orientationRects = {
    left: prepareVerticalOrientationRects(regionRects.left),
    right: prepareVerticalOrientationRects(regionRects.right),
  };

  return {
    numBaselineRects: baselineRects.length,
    idealBaseline: baselineRects[0],
    ...orientationRects,
  };
}

function getTooltipBaselineOpportunityAreas(tooltip) {
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

function addHoverableTooltipPageListeners() {
  const {state} = hoverableTooltipInfo;

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

clientSteps.addPageListeners.push(addHoverableTooltipPageListeners);

// Data & info card ---------------------------------------

/*
function colorLink(a, color) {
  console.warn('Info card link colors temporarily disabled: chroma.js required, no dependency linking for client.js yet');
  return;

  // eslint-disable-next-line no-unreachable
  const chroma = {};

  if (color) {
    const {primary, dim} = getColors(color, {chroma});
    a.style.setProperty('--primary-color', primary);
    a.style.setProperty('--dim-color', dim);
  }
}

function link(a, type, {name, directory, color}) {
  colorLink(a, color);
  a.innerText = name;
  a.href = getLinkHref(type, directory);
}

function joinElements(type, elements) {
  // We can't use the Intl APIs with elements, 8ecuase it only oper8tes on
  // strings. So instead, we'll pass the element's outer HTML's (which means
  // the entire HTML of that element).
  //
  // That does mean this function returns a string, so always 8e sure to
  // set innerHTML when using it (not appendChild).

  return list[type](elements.map((el) => el.outerHTML));
}

const infoCard = (() => {
  const container = document.getElementById('info-card-container');

  let cancelShow = false;
  let hideTimeout = null;
  let showing = false;

  container.addEventListener('mouseenter', cancelHide);
  container.addEventListener('mouseleave', readyHide);

  function show(type, target) {
    cancelShow = false;

    fetchData(type, target.dataset[type]).then((data) => {
      // Manual DOM 'cuz we're laaaazy.

      if (cancelShow) {
        return;
      }

      showing = true;

      const rect = target.getBoundingClientRect();

      container.style.setProperty('--primary-color', data.color);

      container.style.top = window.scrollY + rect.bottom + 'px';
      container.style.left = window.scrollX + rect.left + 'px';

      // Use a short timeout to let a currently hidden (or not yet shown)
      // info card teleport to the position set a8ove. (If it's currently
      // shown, it'll transition to that position.)
      setTimeout(() => {
        container.classList.remove('hide');
        container.classList.add('show');
      }, 50);

      // 8asic details.

      const nameLink = container.querySelector('.info-card-name a');
      link(nameLink, 'track', data);

      const albumLink = container.querySelector('.info-card-album a');
      link(albumLink, 'album', data.album);

      const artistSpan = container.querySelector('.info-card-artists span');
      artistSpan.innerHTML = joinElements(
        'conjunction',
        data.artists.map(({artist}) => {
          const a = document.createElement('a');
          a.href = getLinkHref('artist', artist.directory);
          a.innerText = artist.name;
          return a;
        })
      );

      const coverArtistParagraph = container.querySelector(
        '.info-card-cover-artists'
      );
      const coverArtistSpan = coverArtistParagraph.querySelector('span');
      if (data.coverArtists.length) {
        coverArtistParagraph.style.display = 'block';
        coverArtistSpan.innerHTML = joinElements(
          'conjunction',
          data.coverArtists.map(({artist}) => {
            const a = document.createElement('a');
            a.href = getLinkHref('artist', artist.directory);
            a.innerText = artist.name;
            return a;
          })
        );
      } else {
        coverArtistParagraph.style.display = 'none';
      }

      // Cover art.

      const [containerNoReveal, containerReveal] = [
        container.querySelector('.info-card-art-container.no-reveal'),
        container.querySelector('.info-card-art-container.reveal'),
      ];

      const [containerShow, containerHide] = data.cover.warnings.length
        ? [containerReveal, containerNoReveal]
        : [containerNoReveal, containerReveal];

      containerHide.style.display = 'none';
      containerShow.style.display = 'block';

      const img = containerShow.querySelector('.info-card-art');
      img.src = rebase(data.cover.paths.small, 'rebaseMedia');

      const imgLink = containerShow.querySelector('a');
      colorLink(imgLink, data.color);
      imgLink.href = rebase(data.cover.paths.original, 'rebaseMedia');

      if (containerShow === containerReveal) {
        const cw = containerShow.querySelector('.info-card-art-warnings');
        cw.innerText = list.unit(data.cover.warnings);

        const reveal = containerShow.querySelector('.reveal');
        reveal.classList.remove('revealed');
      }
    });
  }

  function hide() {
    container.classList.remove('show');
    container.classList.add('hide');
    cancelShow = true;
    showing = false;
  }

  function readyHide() {
    if (!hideTimeout && showing) {
      hideTimeout = setTimeout(hide, HIDE_HOVER_DELAY);
    }
  }

  function cancelHide() {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  }

  return {
    show,
    hide,
    readyHide,
    cancelHide,
  };
})();

// Info cards are disa8led for now since they aren't quite ready for release,
// 8ut you can try 'em out 8y setting this localStorage flag!
//
//     localStorage.tryInfoCards = true;
//
if (localStorage.tryInfoCards) {
  addInfoCardLinkHandlers('track');
}
*/

// Custom hash links --------------------------------------

const hashLinkInfo = initInfo('hashLinkInfo', {
  links: null,
  hrefs: null,
  targets: null,

  state: {
    highlightedTarget: null,
    scrollingAfterClick: false,
    concludeScrollingStateInterval: null,
  },

  event: {
    beforeHashLinkScrolls: [],
    whenHashLinkClicked: [],
  },
});

function getHashLinkReferences() {
  const info = hashLinkInfo;

  info.links =
    Array.from(document.querySelectorAll('a[href^="#"]:not([href="#"])'));

  info.hrefs =
    info.links
      .map(link => link.getAttribute('href'));

  info.targets =
    info.hrefs
      .map(href => document.getElementById(href.slice(1)));

  filterMultipleArrays(
    info.links,
    info.hrefs,
    info.targets,
    (_link, _href, target) => target);
}

function processScrollingAfterHashLinkClicked() {
  const {state} = hashLinkInfo;

  if (state.concludeScrollingStateInterval) return;

  let lastScroll = window.scrollY;
  state.scrollingAfterClick = true;
  state.concludeScrollingStateInterval = setInterval(() => {
    if (Math.abs(window.scrollY - lastScroll) < 10) {
      clearInterval(state.concludeScrollingStateInterval);
      state.scrollingAfterClick = false;
      state.concludeScrollingStateInterval = null;
    } else {
      lastScroll = window.scrollY;
    }
  }, 200);
}

function addHashLinkListeners() {
  // Instead of defining a scroll offset (to account for the sticky heading)
  // in JavaScript, we interface with the CSS property 'scroll-margin-top'.
  // This lets the scroll offset be consolidated where it makes sense, and
  // sets an appropriate offset when (re)loading a page with hash for free!

  const info = hashLinkInfo;
  const {state, event} = info;

  for (const {hashLink, href, target} of stitchArrays({
    hashLink: info.links,
    href: info.hrefs,
    target: info.targets,
  })) {
    hashLink.addEventListener('click', evt => {
      if (evt.metaKey || evt.shiftKey || evt.ctrlKey || evt.altKey) {
        return;
      }

      // Don't do anything if the target element isn't actually visible!
      if (target.offsetParent === null) {
        return;
      }

      // Allow event handlers to prevent scrolling.
      const listenerResults =
        dispatchInternalEvent(event, 'beforeHashLinkScrolls', {
          link: hashLink,
          target,
        });

      if (listenerResults.includes(false)) {
        return;
      }

      // Hide skipper box right away, so the layout is updated on time for the
      // math operations coming up next.
      const skipper = document.getElementById('skippers');
      skipper.style.display = 'none';
      setTimeout(() => skipper.style.display = '');

      const box = target.getBoundingClientRect();
      const style = window.getComputedStyle(target);

      const scrollY =
          window.scrollY
        + box.top
        - style['scroll-margin-top'].replace('px', '');

      evt.preventDefault();
      history.pushState({}, '', href);
      window.scrollTo({top: scrollY, behavior: 'smooth'});
      target.focus({preventScroll: true});

      const maxScroll =
          document.body.scrollHeight
        - window.innerHeight;

      if (scrollY > maxScroll && target.classList.contains('content-heading')) {
        if (state.highlightedTarget) {
          state.highlightedTarget.classList.remove('highlight-hash-link');
        }

        target.classList.add('highlight-hash-link');
        state.highlightedTarget = target;
      }

      processScrollingAfterHashLinkClicked();

      dispatchInternalEvent(event, 'whenHashLinkClicked', {
        link: hashLink,
        target,
      });
    });
  }

  for (const target of info.targets) {
    target.addEventListener('animationend', evt => {
      if (evt.animationName !== 'highlight-hash-link') return;
      target.classList.remove('highlight-hash-link');
      if (target !== state.highlightedTarget) return;
      state.highlightedTarget = null;
    });
  }
}

clientSteps.getPageReferences.push(getHashLinkReferences);
clientSteps.addPageListeners.push(addHashLinkListeners);

// Sticky content heading ---------------------------------

const stickyHeadingInfo = initInfo('stickyHeadingInfo', {
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
});

function getStickyHeadingReferences() {
  const info = stickyHeadingInfo;

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

function removeTextPlaceholderStickyHeadingCovers() {
  const info = stickyHeadingInfo;

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
  const info = stickyHeadingInfo;

  const stickyCoversWhichReveal =
    info.stickyCovers
      .filter((_el, index) => info.contentCoversReveal[index]);

  for (const el of stickyCoversWhichReveal) {
    el.classList.add('content-sticky-heading-cover-needs-reveal');
  }
}

function addRevealListenersForStickyHeadingCovers() {
  const info = stickyHeadingInfo;

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
  const info = stickyHeadingInfo;

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
  const info = stickyHeadingInfo;

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
  const info = stickyHeadingInfo;
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
      closestHeading.querySelector('.content-heading-main-title')
        // Just for compatibility with older builds of the site.
        ?? closestHeading;

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

function updateStickyHeadings(index) {
  updateStickyCoverVisibility(index);
  updateStickySubheadingContent(index);
}

function initializeStateForStickyHeadings() {
  for (let i = 0; i < stickyHeadingInfo.stickyContainers.length; i++) {
    updateStickyHeadings(i);
  }
}

function addScrollListenerForStickyHeadings() {
  document.addEventListener('scroll', () => {
    for (let i = 0; i < stickyHeadingInfo.stickyContainers.length; i++) {
      updateStickyHeadings(i);
    }
  });
}

clientSteps.getPageReferences.push(getStickyHeadingReferences);
clientSteps.mutatePageContent.push(removeTextPlaceholderStickyHeadingCovers);
clientSteps.mutatePageContent.push(addRevealClassToStickyHeadingCovers);
clientSteps.initializeState.push(initializeStateForStickyHeadings);
clientSteps.addPageListeners.push(addRevealListenersForStickyHeadingCovers);
clientSteps.addPageListeners.push(addScrollListenerForStickyHeadings);

// Image overlay ------------------------------------------

// TODO: Update to clientSteps style.

function addImageOverlayClickHandlers() {
  const container = document.getElementById('image-overlay-container');

  if (!container) {
    console.warn(`#image-overlay-container missing, image overlay module disabled.`);
    return;
  }

  for (const link of document.querySelectorAll('.image-link')) {
    if (link.closest('.no-image-preview')) {
      continue;
    }

    link.addEventListener('click', handleImageLinkClicked);
  }

  const actionContainer = document.getElementById('image-overlay-action-container');

  container.addEventListener('click', handleContainerClicked);
  document.body.addEventListener('keydown', handleKeyDown);

  function handleContainerClicked(evt) {
    // Only hide the image overlay if actually clicking the background.
    if (evt.target !== container) {
      return;
    }

    // If you clicked anything close to or beneath the action bar, don't hide
    // the image overlay.
    const rect = actionContainer.getBoundingClientRect();
    if (evt.clientY >= rect.top - 40) {
      return;
    }

    container.classList.remove('visible');
  }

  function handleKeyDown(evt) {
    if (evt.key === 'Escape' || evt.key === 'Esc' || evt.keyCode === 27) {
      container.classList.remove('visible');
    }
  }
}

async function handleImageLinkClicked(evt) {
  if (evt.metaKey || evt.shiftKey || evt.altKey) {
    return;
  }

  evt.preventDefault();

  // Don't show the overlay if the image still needs to be revealed.
  if (evt.target.closest('.reveal:not(.revealed)')) {
    return;
  }

  const container = document.getElementById('image-overlay-container');
  container.classList.add('visible');
  container.classList.remove('loaded');
  container.classList.remove('errored');

  const allViewOriginal = document.getElementsByClassName('image-overlay-view-original');
  const mainImage = document.getElementById('image-overlay-image');
  const thumbImage = document.getElementById('image-overlay-image-thumb');

  const {href: originalSrc} = evt.target.closest('a');

  const {
    src: embeddedSrc,
    dataset: {
      originalSize: originalFileSize,
      thumbs: availableThumbList,
    },
  } = evt.target.closest('a').querySelector('img');

  updateFileSizeInformation(originalFileSize);

  let mainSrc = null;
  let thumbSrc = null;

  if (availableThumbList) {
    const {thumb: mainThumb, length: mainLength} = getPreferredThumbSize(availableThumbList);
    const {thumb: smallThumb, length: smallLength} = getSmallestThumbSize(availableThumbList);
    mainSrc = embeddedSrc.replace(/\.[a-z]+\.(jpg|png)$/, `.${mainThumb}.jpg`);
    thumbSrc = embeddedSrc.replace(/\.[a-z]+\.(jpg|png)$/, `.${smallThumb}.jpg`);
    // Show the thumbnail size on each <img> element's data attributes.
    // Y'know, just for debugging convenience.
    mainImage.dataset.displayingThumb = `${mainThumb}:${mainLength}`;
    thumbImage.dataset.displayingThumb = `${smallThumb}:${smallLength}`;
  } else {
    mainSrc = originalSrc;
    thumbSrc = null;
    mainImage.dataset.displayingThumb = '';
    thumbImage.dataset.displayingThumb = '';
  }

  if (thumbSrc) {
    thumbImage.src = thumbSrc;
    thumbImage.style.display = null;
  } else {
    thumbImage.src = '';
    thumbImage.style.display = 'none';
  }

  for (const viewOriginal of allViewOriginal) {
    viewOriginal.href = originalSrc;
  }

  mainImage.addEventListener('load', handleMainImageLoaded);
  mainImage.addEventListener('error', handleMainImageErrored);

  const showProgress = amount => {
    cssProp(container, '--download-progress', `${amount * 100}%`);
  };

  showProgress(0.00);

  const response =
    await fetchWithProgress(mainSrc, progress => {
      if (progress === -1) {
        // TODO: Indeterminate response progress cue
        showProgress(0.00);
      } else {
        showProgress(0.20 + 0.80 * progress);
      }
    });

  if (!response.status.toString().startsWith('2')) {
    handleMainImageErrored();
    return;
  }

  const blob = await response.blob();
  const blobSrc = URL.createObjectURL(blob);

  mainImage.src = blobSrc;
  showProgress(1.00);

  function handleMainImageLoaded() {
    container.classList.add('loaded');
    removeEventListeners();
  }

  function handleMainImageErrored() {
    container.classList.add('errored');
    removeEventListeners();
  }

  function removeEventListeners() {
    mainImage.removeEventListener('load', handleMainImageLoaded);
    mainImage.removeEventListener('error', handleMainImageErrored);
  }
}

function parseThumbList(availableThumbList) {
  // Parse all the available thumbnail sizes! These are provided by the actual
  // content generation on each image.
  const defaultThumbList = 'huge:1400 semihuge:1200 large:800 medium:400 small:250'
  const availableSizes =
    (availableThumbList || defaultThumbList)
      .split(' ')
      .map(part => part.split(':'))
      .map(([thumb, length]) => ({thumb, length: parseInt(length)}))
      .sort((a, b) => a.length - b.length);

  return availableSizes;
}

function getPreferredThumbSize(availableThumbList) {
  // Assuming a square, the image will be constrained to the lesser window
  // dimension. Coefficient here matches CSS dimensions for image overlay.
  const constrainedLength = Math.floor(Math.min(
    0.80 * window.innerWidth,
    0.80 * window.innerHeight));

  // Match device pixel ratio, which is 2x for "retina" displays and certain
  // device configurations.
  const visualLength = window.devicePixelRatio * constrainedLength;

  const availableSizes = parseThumbList(availableThumbList);

  // Starting from the smallest dimensions, find (and return) the first
  // available length which hits a "good enough" threshold - it's got to be
  // at least that percent of the way to the actual displayed dimensions.
  const goodEnoughThreshold = 0.90;

  // (The last item is skipped since we'd be falling back to it anyway.)
  for (const {thumb, length} of availableSizes.slice(0, -1)) {
    if (Math.floor(visualLength * goodEnoughThreshold) <= length) {
      return {thumb, length};
    }
  }

  // If none of the items in the list were big enough to hit the "good enough"
  // threshold, just use the largest size available.
  return availableSizes[availableSizes.length - 1];
}

function getSmallestThumbSize(availableThumbList) {
  // Just snag the smallest size. This'll be used for displaying the "preview"
  // as the bigger one is loading.
  const availableSizes = parseThumbList(availableThumbList);
  return availableSizes[0];
}

function updateFileSizeInformation(fileSize) {
  const fileSizeWarningThreshold = 8 * 10 ** 6;

  const actionContentWithoutSize = document.getElementById('image-overlay-action-content-without-size');
  const actionContentWithSize = document.getElementById('image-overlay-action-content-with-size');

  if (!fileSize) {
    actionContentWithSize.classList.remove('visible');
    actionContentWithoutSize.classList.add('visible');
    return;
  }

  actionContentWithoutSize.classList.remove('visible');
  actionContentWithSize.classList.add('visible');

  const megabytesContainer = document.getElementById('image-overlay-file-size-megabytes');
  const kilobytesContainer = document.getElementById('image-overlay-file-size-kilobytes');
  const megabytesContent = megabytesContainer.querySelector('.image-overlay-file-size-count');
  const kilobytesContent = kilobytesContainer.querySelector('.image-overlay-file-size-count');
  const fileSizeWarning = document.getElementById('image-overlay-file-size-warning');

  fileSize = parseInt(fileSize);
  const round = (exp) => Math.round(fileSize / 10 ** (exp - 1)) / 10;

  if (fileSize > fileSizeWarningThreshold) {
    fileSizeWarning.classList.add('visible');
  } else {
    fileSizeWarning.classList.remove('visible');
  }

  if (fileSize > 10 ** 6) {
    megabytesContainer.classList.add('visible');
    kilobytesContainer.classList.remove('visible');
    megabytesContent.innerText = round(6);
  } else {
    megabytesContainer.classList.remove('visible');
    kilobytesContainer.classList.add('visible');
    kilobytesContent.innerText = round(3);
  }

  void fileSizeWarning;
}

addImageOverlayClickHandlers();

// "Additional names" box ---------------------------------

const additionalNamesBoxInfo = initInfo('additionalNamesBox', {
  box: null,
  links: null,
  mainContentContainer: null,

  state: {
    visible: false,
  },
});

function getAdditionalNamesBoxReferences() {
  const info = additionalNamesBoxInfo;

  info.box =
    document.getElementById('additional-names-box');

  info.links =
    document.querySelectorAll('a[href="#additional-names-box"]');

  info.mainContentContainer =
    document.querySelector('#content .main-content-container');
}

function addAdditionalNamesBoxInternalListeners() {
  const info = additionalNamesBoxInfo;

  hashLinkInfo.event.beforeHashLinkScrolls.push(({target}) => {
    if (target === info.box) {
      return false;
    }
  });
}

function addAdditionalNamesBoxListeners() {
  const info = additionalNamesBoxInfo;

  for (const link of info.links) {
    link.addEventListener('click', domEvent => {
      handleAdditionalNamesBoxLinkClicked(domEvent);
    });
  }
}

function handleAdditionalNamesBoxLinkClicked(domEvent) {
  const info = additionalNamesBoxInfo;
  const {state} = info;

  domEvent.preventDefault();

  if (!info.box || !info.mainContentContainer) return;

  const margin =
    +(cssProp(info.box, 'scroll-margin-top').replace('px', ''));

  const {top} =
    (state.visible
      ? info.box.getBoundingClientRect()
      : info.mainContentContainer.getBoundingClientRect());

  if (top + 20 < margin || top > 0.4 * window.innerHeight) {
    if (!state.visible) {
      toggleAdditionalNamesBox();
    }

    window.scrollTo({
      top: window.scrollY + top - margin,
      behavior: 'smooth',
    });
  } else {
    toggleAdditionalNamesBox();
  }
}

function toggleAdditionalNamesBox() {
  const info = additionalNamesBoxInfo;
  const {state} = info;

  state.visible = !state.visible;
  info.box.style.display =
    (state.visible
      ? 'block'
      : 'none');
}

clientSteps.getPageReferences.push(getAdditionalNamesBoxReferences);
clientSteps.addInternalListeners.push(addAdditionalNamesBoxInternalListeners);
clientSteps.addPageListeners.push(addAdditionalNamesBoxListeners);

// Scoped chronology links --------------------------------

const scopedChronologyLinksInfo = initInfo('scopedChronologyLinksInfo', {
  switcher: null,
  containers: null,
  switcherLinks: null,
  modes: null,

  session: {
    selectedMode: 'wiki',
  },
});

function getScopedChronologyLinksReferences() {
  const info = scopedChronologyLinksInfo;

  info.switcher =
    document.querySelector('.scoped-chronology-switcher');

  if (!info.switcher) {
    return;
  }

  info.containers =
    Array.from(info.switcher.querySelectorAll(':scope > div'));

  info.switcherLinks =
    Array.from(info.switcher.querySelectorAll('.switcher-link'));

  info.modes =
    info.containers
      .map(container =>
        Array.from(container.classList)
          .find(className => className.startsWith('scope-'))
          .slice('scope-'.length));
}

function addScopedChronologyLinksPageHandlers() {
  const info = scopedChronologyLinksInfo;
  const {session} = scopedChronologyLinksInfo;

  if (!info.switcher) {
    return;
  }

  for (const [index, {
    container: currentContainer,
    switcherLink: currentSwitcherLink,
  }] of stitchArrays({
    container: info.containers,
    switcherLink: info.switcherLinks,
  }).entries()) {
    const nextContainer =
      atOffset(info.containers, index, +1, {wrap: true});

    const nextSwitcherLink =
      atOffset(info.switcherLinks, index, +1, {wrap: true});

    const nextMode =
      atOffset(info.modes, index, +1, {wrap: true});

    currentSwitcherLink.addEventListener('click', domEvent => {
      domEvent.preventDefault();

      cssProp(currentContainer, 'display', 'none');
      cssProp(currentSwitcherLink, 'display', 'none');
      cssProp(nextContainer, 'display', 'block');
      cssProp(nextSwitcherLink, 'display', 'inline');

      session.selectedMode = nextMode;
    });
  }
}

function mutateScopedChronologyLinksContent() {
  const info = scopedChronologyLinksInfo;

  if (!info.switcher) {
    return;
  }

  const {selectedMode} = info.session;

  if (info.modes.includes(selectedMode)) {
    const selectedIndex = info.modes.indexOf(selectedMode);

    for (const [index, {
      container,
      switcherLink,
    }] of stitchArrays({
      container: info.containers,
      switcherLink: info.switcherLinks,
    }).entries()) {
      if (index === selectedIndex) {
        cssProp(container, 'display', 'block');
        cssProp(switcherLink, 'display', 'inline');
      } else {
        cssProp(container, 'display', 'none');
        cssProp(switcherLink, 'display', 'none');
      }
    }
  }
}

clientSteps.getPageReferences.push(getScopedChronologyLinksReferences);
clientSteps.mutatePageContent.push(mutateScopedChronologyLinksContent);
clientSteps.addPageListeners.push(addScopedChronologyLinksPageHandlers);

// Group contributions table ------------------------------

// TODO: Update to clientSteps style.

const groupContributionsTableInfo =
  Array.from(document.querySelectorAll('#content dl'))
    .filter(dl => dl.querySelector('a.group-contributions-sort-button'))
    .map(dl => ({
      sortingByCountLink: dl.querySelector('dt.group-contributions-sorted-by-count a.group-contributions-sort-button'),
      sortingByDurationLink: dl.querySelector('dt.group-contributions-sorted-by-duration a.group-contributions-sort-button'),
      sortingByCountElements: dl.querySelectorAll('.group-contributions-sorted-by-count'),
      sortingByDurationElements: dl.querySelectorAll('.group-contributions-sorted-by-duration'),
    }));

function sortGroupContributionsTableBy(info, sort) {
  const [showThese, hideThese] =
    (sort === 'count'
      ? [info.sortingByCountElements, info.sortingByDurationElements]
      : [info.sortingByDurationElements, info.sortingByCountElements]);

  for (const element of showThese) element.classList.add('visible');
  for (const element of hideThese) element.classList.remove('visible');
}

for (const info of groupContributionsTableInfo) {
  info.sortingByCountLink.addEventListener('click', evt => {
    evt.preventDefault();
    sortGroupContributionsTableBy(info, 'duration');
  });

  info.sortingByDurationLink.addEventListener('click', evt => {
    evt.preventDefault();
    sortGroupContributionsTableBy(info, 'count');
  });
}

// Generic links with tooltips ----------------------------

const textWithTooltipInfo = initInfo('textWithTooltipInfo', {
  hoverables: null,
  tooltips: null,
});

function getTextWithTooltipReferences() {
  const info = textWithTooltipInfo;

  const spans =
    Array.from(document.querySelectorAll('.text-with-tooltip'));

  info.hoverables =
    spans.map(span => span.children[0]);

  info.tooltips =
    spans.map(span => span.children[1]);
}

function addTextWithTooltipPageListeners() {
  const info = textWithTooltipInfo;

  for (const {hoverable, tooltip} of stitchArrays({
    hoverable: info.hoverables,
    tooltip: info.tooltips,
  })) {
    registerTooltipElement(tooltip);
    registerTooltipHoverableElement(hoverable, tooltip);
  }
}

clientSteps.getPageReferences.push(getTextWithTooltipReferences);
clientSteps.addPageListeners.push(addTextWithTooltipPageListeners);

// Datetimestamp tooltips ---------------------------------

const datetimestampTooltipInfo = initInfo('datetimestampTooltipInfo', {
  hoverables: null,
  tooltips: null,
});

function getDatestampTooltipReferences() {
  const info = datetimestampTooltipInfo;

  const spans =
    Array.from(document.querySelectorAll('span.datetimestamp.has-tooltip'));

  info.hoverables =
    spans.map(span => span.querySelector('time'));

  info.tooltips =
    spans.map(span => span.querySelector('span.datetimestamp-tooltip'));
}

function addDatestampTooltipPageListeners() {
  const info = datetimestampTooltipInfo;

  for (const {hoverable, tooltip} of stitchArrays({
    hoverable: info.hoverables,
    tooltip: info.tooltips,
  })) {
    registerTooltipElement(tooltip);
    registerTooltipHoverableElement(hoverable, tooltip);
  }
}

clientSteps.getPageReferences.push(getDatestampTooltipReferences);
clientSteps.addPageListeners.push(addDatestampTooltipPageListeners);

// Artist external link tooltips --------------------------

// These don't need to have tooltip events specially added as
// they're implemented with "text with tooltip" components.

const artistExternalLinkTooltipInfo = initInfo('artistExternalLinkTooltipInfo', {
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
});

function getArtistExternalLinkTooltipPageReferences() {
  const info = artistExternalLinkTooltipInfo;

  info.tooltips =
    Array.from(document.getElementsByClassName('icons-tooltip'));

  info.tooltipRows =
    info.tooltips.map(tooltip =>
      Array.from(tooltip.getElementsByClassName('icon')));
}

function addArtistExternalLinkTooltipInternalListeners() {
  const info = artistExternalLinkTooltipInfo;

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

function addArtistExternalLinkTooltipPageListeners() {
  const info = artistExternalLinkTooltipInfo;

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
  const info = artistExternalLinkTooltipInfo;
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

  const currentMovementDistance =
    Math.sqrt(domEvent.movementX ** 2 + domEvent.movementY ** 2);

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
  const info = artistExternalLinkTooltipInfo;
  const {state} = info;

  state.showingTooltipInfo = true;

  for (const tooltip of info.tooltips) {
    tooltip.classList.add('show-info');
  }
}

function hideArtistExternalLinkTooltipInfo() {
  const info = artistExternalLinkTooltipInfo;
  const {state} = info;

  state.showingTooltipInfo = false;

  for (const tooltip of info.tooltips) {
    tooltip.classList.remove('show-info');
  }
}

clientSteps.getPageReferences.push(getArtistExternalLinkTooltipPageReferences);
clientSteps.addInternalListeners.push(addArtistExternalLinkTooltipInternalListeners);
clientSteps.addPageListeners.push(addArtistExternalLinkTooltipPageListeners);

// Internal search functionality --------------------------

const wikiSearchInfo = initInfo('wikiSearchInfo', {
  state: {
    worker: null,

    workerReadyPromise: null,
    workerReadyPromiseResolvers: null,

    workerActionCounter: 0,
    workerActionPromiseResolverMap: new Map(),
  },
});

async function initializeSearchWorker() {
  const {state} = wikiSearchInfo;

  if (state.worker) {
    return await state.workerReadyPromise;
  }

  state.worker =
    new Worker(
      import.meta.resolve('./search-worker.js'),
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

    default:
      console.warn(`Unknown message kind "${message.data.kind}" <- from search worker`);
      break;
  }
}

function handleSearchWorkerStatusMessage(message) {
  const {state} = wikiSearchInfo;

  switch (message.data.status) {
    case 'alive':
      console.debug(`Search worker is alive, but not yet ready.`);
      break;

    case 'ready':
      console.debug(`Search worker has loaded corpuses and is ready.`);
      state.workerReadyPromiseResolvers.resolve(state.worker);
      break;

    case 'setup-error':
      console.debug(`Search worker failed to initialize.`);
      state.workerReadyPromiseResolvers.reject('setup-error');
      break;

    default:
      console.warn(`Unknown status "${message.data.status}" <- from search worker`);
      break;
  }
}

function handleSearchWorkerResultMessage(message) {
  const {state} = wikiSearchInfo;
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

async function postSearchWorkerAction(action, options) {
  const {state} = wikiSearchInfo;

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

async function searchAll(query, options = {}) {
  return await postSearchWorkerAction('search', {
    query,
    options,
  });
}

// Sidebar search box -------------------------------------

const sidebarSearchInfo = initInfo('sidebarSearchInfo', {
  searchBox: null,
  searchInput: null,

  resultsRule: null,
  resultsContainer: null,
  results: null,

  endSearchRule: null,
  endSearchLine: null,
  endSearchLink: null,

  noResultsString: null,
  currentResultString: null,
  endSearchString: null,

  artistResultKindString: null,

  state: {
    stoppedTypingTimeout: null,
  },

  session: {
    activeQuery: null,
    activeQueryResults: null,

    repeatQueryOnReload: false,
  },

  settings: {
    stoppedTyingDelay: 800,

    maxActiveResultsStorage: 100000,
  },
});

function getSidebarSearchReferences() {
  const info = sidebarSearchInfo;

  info.searchBox =
    document.querySelector('.wiki-search-sidebar-box');

  info.searchInput =
    info.searchBox.querySelector('.wiki-search-input');

  const findString = classPart =>
    info.searchBox.querySelector(`.wiki-search-${classPart}-string`);

  info.noResultsString =
    findString('no-results');

  info.currentResultString =
    findString('current-result');

  info.endSearchString =
    findString('end-search');

  info.artistResultKindString =
    findString('artist-result-kind');
}

function mutateSidebarSearchContent() {
  const info = sidebarSearchInfo;

  if (!info.searchBox) return;

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

  info.endSearchRule =
    document.createElement('hr');

  info.searchBox.appendChild(info.endSearchRule);

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

function addSidebarSearchListeners() {
  const info = sidebarSearchInfo;

  if (!info.searchInput) return;

  info.searchInput.addEventListener('change', domEvent => {
    if (info.searchInput.value) {
      activateSidebarSearch(info.searchInput.value);
    }
  });

  info.searchInput.addEventListener('input', domEvent => {
    const {settings, state} = info;

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
      }, settings.stoppedTyingDelay);
  });

  info.endSearchLink.addEventListener('click', domEvent => {
    domEvent.preventDefault();
    clearSidebarSearch();
  });
}

function initializeSidebarSearchState() {
  const info = sidebarSearchInfo;
  const {session} = info;

  if (!info.searchInput) return;

  if (session.activeQuery) {
    info.searchInput.value = session.activeQuery;
  }

  if (session.repeatQueryOnReload) {
    activateSidebarSearch(session.activeQuery);
  } else if (session.activeQueryResults) {
    showSidebarSearchResults(JSON.parse(session.activeQueryResults));
  }
}

async function activateSidebarSearch(query) {
  const {session, settings, state} = sidebarSearchInfo;

  if (state.stoppedTypingTimeout) {
    clearTimeout(state.stoppedTypingTimeout);
    state.stoppedTypingTimeout = null;
  }

  const results = await searchAll(query, {enrich: true});

  session.activeQuery = query;

  const stringifiedResults = JSON.stringify(results);
  if (stringifiedResults.length < settings.maxActiveResultsStorage) {
    session.activeQueryResults = JSON.stringify(results);
  }

  showSidebarSearchResults(results);
}

function clearSidebarSearch() {
  const info = sidebarSearchInfo;
  const {session, state} = info;

  if (state.stoppedTypingTimeout) {
    clearTimeout(state.stoppedTypingTimeout);
    state.stoppedTypingTimeout = null;
  }

  info.searchBox.classList.remove('showing-results');

  info.searchInput.value = '';

  session.activeQuery = '';
  session.activeQueryResults = '';

  hideSidebarSearchResults();
}

function showSidebarSearchResults(results) {
  const info = sidebarSearchInfo;

  console.debug(`Showing search results:`, results);

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
  }
}

function generateSidebarSearchResult(result) {
  const info = sidebarSearchInfo;

  const preparedSlots = {
    color:
      result.data.color ?? null,

    name:
      result.data.name ?? result.data.primaryName ?? null,

    imageSource:
      getSearchResultImageSource(result),
  };

  switch (result.referenceType) {
    case 'artist': {
      preparedSlots.href =
        openArtist(result.directory);

      preparedSlots.kindString =
        info.artistResultKindString;

      break;
    }

    case 'flash': {
      preparedSlots.href =
        openFlash(result.directory);

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
  const info = sidebarSearchInfo;

  const link = document.createElement('a');
  link.classList.add('wiki-search-result');

  if (slots.href) {
    link.setAttribute('href', slots.href);
  }

  if (slots.color) {
    cssProp(link, '--primary-color', slots.color);

    try {
      const colors = getColors(slots.color, {chroma});
      cssProp(link, '--light-ghost-color', colors.lightGhost);
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

  return link;
}

function hideSidebarSearchResults() {
  const info = sidebarSearchInfo;

  cssProp(info.resultsRule, 'display', 'none');
  cssProp(info.resultsContainer, 'display', 'none');

  while (info.results.firstChild) {
    info.results.firstChild.remove();
  }

  cssProp(info.endSearchRule, 'display', 'none');
  cssProp(info.endSearchLine, 'display', 'none');
}

clientSteps.getPageReferences.push(getSidebarSearchReferences);
clientSteps.mutatePageContent.push(mutateSidebarSearchContent);
clientSteps.addPageListeners.push(addSidebarSearchListeners);
clientSteps.initializeState.push(initializeSidebarSearchState);

// Sticky commentary sidebar ------------------------------

const albumCommentarySidebarInfo = initInfo('albumCommentarySidebarInfo', {
  sidebar: null,
  sidebarHeading: null,

  sidebarTrackLinks: null,
  sidebarTrackDirectories: null,

  sidebarTrackSections: null,
  sidebarTrackSectionStartIndices: null,

  state: {
    currentTrackSection: null,
    currentTrackLink: null,
    justChangedTrackSection: false,
  },
});

function getAlbumCommentarySidebarReferences() {
  const info = albumCommentarySidebarInfo;

  info.sidebar =
    document.getElementById('sidebar-left');

  info.sidebarHeading =
    info.sidebar.querySelector('h1');

  info.sidebarTrackLinks =
    Array.from(info.sidebar.querySelectorAll('li a'));

  info.sidebarTrackDirectories =
    info.sidebarTrackLinks
      .map(el => el.getAttribute('href')?.slice(1) ?? null);

  info.sidebarTrackSections =
    Array.from(info.sidebar.getElementsByTagName('details'));

  info.sidebarTrackSectionStartIndices =
    info.sidebarTrackSections
      .map(details => details.querySelector('ol, ul'))
      .reduce(
        (accumulator, _list, index, array) =>
          (empty(accumulator)
            ? [0]
            : [
              ...accumulator,
              (accumulator[accumulator.length - 1] +
                array[index - 1].querySelectorAll('li a').length),
            ]),
        []);
}

function scrollAlbumCommentarySidebar() {
  const info = albumCommentarySidebarInfo;
  const {state} = info;
  const {currentTrackLink, currentTrackSection} = state;

  if (!currentTrackLink) {
    return;
  }

  const {sidebar, sidebarHeading} = info;

  const scrollTop = sidebar.scrollTop;

  const headingRect = sidebarHeading.getBoundingClientRect();
  const sidebarRect = sidebar.getBoundingClientRect();

  const stickyPadding = headingRect.height;
  const sidebarViewportHeight = sidebarRect.height - stickyPadding;

  const linkRect = currentTrackLink.getBoundingClientRect();
  const sectionRect = currentTrackSection.getBoundingClientRect();

  const sectionTopEdge =
    sectionRect.top - (sidebarRect.top - scrollTop);

  const sectionHeight =
    sectionRect.height;

  const sectionScrollTop =
    sectionTopEdge - stickyPadding - 10;

  const linkTopEdge =
    linkRect.top - (sidebarRect.top - scrollTop);

  const linkBottomEdge =
    linkRect.bottom - (sidebarRect.top - scrollTop);

  const linkScrollTop =
    linkTopEdge - stickyPadding - 5;

  const linkVisibleFromTopOfSection =
    linkBottomEdge - sectionTopEdge > sidebarViewportHeight;

  const linkScrollBottom =
    linkScrollTop - sidebarViewportHeight + linkRect.height + 20;

  const maxScrollInViewport =
    scrollTop + stickyPadding + sidebarViewportHeight;

  const minScrollInViewport =
    scrollTop + stickyPadding;

  if (linkBottomEdge > maxScrollInViewport) {
    if (linkVisibleFromTopOfSection) {
      sidebar.scrollTo({top: linkScrollBottom, behavior: 'smooth'});
    } else {
      sidebar.scrollTo({top: sectionScrollTop, behavior: 'smooth'});
    }
  } else if (linkTopEdge < minScrollInViewport) {
    if (linkVisibleFromTopOfSection) {
      sidebar.scrollTo({top: linkScrollTop, behavior: 'smooth'});
    } else {
      sidebar.scrollTo({top: sectionScrollTop, behavior: 'smooth'});
    }
  } else if (state.justChangedTrackSection) {
    if (sectionHeight < sidebarViewportHeight) {
      sidebar.scrollTo({top: sectionScrollTop, behavior: 'smooth'});
    }
  }
}

function markDirectoryAsCurrentForAlbumCommentary(trackDirectory) {
  const info = albumCommentarySidebarInfo;
  const {state} = info;

  const trackIndex =
    (trackDirectory
      ? info.sidebarTrackDirectories
          .indexOf(trackDirectory)
      : -1);

  const sectionIndex =
    (trackIndex >= 0
      ? info.sidebarTrackSectionStartIndices
          .findIndex((start, index, array) =>
            (index === array.length - 1
              ? true
              : trackIndex < array[index + 1]))
      : -1);

  const sidebarTrackLink =
    (trackIndex >= 0
      ? info.sidebarTrackLinks[trackIndex]
      : null);

  const sidebarTrackSection =
    (sectionIndex >= 0
      ? info.sidebarTrackSections[sectionIndex]
      : null);

  state.currentTrackLink?.classList?.remove('current');
  state.currentTrackLink = sidebarTrackLink;
  state.currentTrackLink?.classList?.add('current');

  if (sidebarTrackSection !== state.currentTrackSection) {
    if (sidebarTrackSection && !sidebarTrackSection.open) {
      if (state.currentTrackSection) {
        state.currentTrackSection.open = false;
      }

      sidebarTrackSection.open = true;
    }

    state.currentTrackSection?.classList?.remove('current');
    state.currentTrackSection = sidebarTrackSection;
    state.currentTrackSection?.classList?.add('current');
    state.justChangedTrackSection = true;
  } else {
    state.justChangedTrackSection = false;
  }
}

function addAlbumCommentaryInternalListeners() {
  const info = albumCommentarySidebarInfo;

  const mainContentIndex =
    (stickyHeadingInfo.contentContainers ?? [])
      .findIndex(({id}) => id === 'content');

  if (mainContentIndex === -1) return;

  stickyHeadingInfo.event.whenDisplayedHeadingChanges.push((index, {newHeading}) => {
    if (index !== mainContentIndex) return;
    if (hashLinkInfo.state.scrollingAfterClick) return;

    const trackDirectory =
      (newHeading
        ? newHeading.id
        : null);

    markDirectoryAsCurrentForAlbumCommentary(trackDirectory);
    scrollAlbumCommentarySidebar();
  });

  hashLinkInfo.event.whenHashLinkClicked.push(({link}) => {
    const hash = link.getAttribute('href').slice(1);
    if (!info.sidebarTrackDirectories.includes(hash)) return;
    markDirectoryAsCurrentForAlbumCommentary(hash);
  });
}

if (document.documentElement.dataset.urlKey === 'localized.albumCommentary') {
  clientSteps.getPageReferences.push(getAlbumCommentarySidebarReferences);
  clientSteps.addInternalListeners.push(addAlbumCommentaryInternalListeners);
}

// Run setup steps ----------------------------------------

for (const [key, steps] of Object.entries(clientSteps)) {
  for (const step of steps) {
    try {
      step();
    } catch (error) {
      console.warn(`During ${key}, failed to run ${step.name}`);
      console.debug(error);
    }
  }
}
