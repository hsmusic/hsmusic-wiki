/* eslint-env browser */

// This is the JS file that gets loaded on the client! It's only really used for
// the random track feature right now - the idea is we only use it for stuff
// that cannot 8e done at static-site compile time, 8y its fundamentally
// ephemeral nature.

import {getColors} from '../util/colors.js';
import {empty, stitchArrays} from '../util/sugar.js';

import {
  filterMultipleArrays,
  getArtistNumContributions,
} from '../util/wiki-data.js';

let albumData, artistData;
let officialAlbumData, fandomAlbumData, beyondAlbumData;

let ready = false;

const clientInfo = window.hsmusicClientInfo = Object.create(null);

const clientSteps = {
  getPageReferences: [],
  addInternalListeners: [],
  mutatePageContent: [],
  initializeState: [],
  addPageListeners: [],
};

// Localiz8tion nonsense ----------------------------------

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

function cssProp(el, key) {
  return getComputedStyle(el).getPropertyValue(key).trim();
}

function getRefDirectory(ref) {
  return ref.split(':')[1];
}

function getAlbum(el) {
  const directory = cssProp(el, '--album-directory');
  return albumData.find((album) => album.directory === directory);
}

// TODO: These should pro8a8ly access some shared urlSpec path. We'd need to
// separ8te the tooling around that into common-shared code too.
const getLinkHref = (type, directory) => rebase(`${type}/${directory}`);
const openAlbum = (d) => rebase(`album/${d}`);
const openTrack = (d) => rebase(`track/${d}`);
const openArtist = (d) => rebase(`artist/${d}`);

// TODO: This should also use urlSpec.
function fetchData(type, directory) {
  return fetch(rebase(`${type}/${directory}/data.json`, 'rebaseData')).then(
    (res) => res.json()
  );
}

// JS-based links -----------------------------------------

const scriptedLinkInfo = clientInfo.scriptedLinkInfo = {
  randomLinks: null,
  revealLinks: null,

  nextLink: null,
  previousLink: null,
  randomLink: null,
};

function getScriptedLinkReferences() {
  scriptedLinkInfo.randomLinks =
    document.querySelectorAll('[data-random]');

  scriptedLinkInfo.revealLinks =
    document.getElementsByClassName('reveal');

  scriptedLinkInfo.nextNavLink =
    document.getElementById('next-button');

  scriptedLinkInfo.previousNavLink =
    document.getElementById('previous-button');

  scriptedLinkInfo.randomNavLink =
    document.getElementById('random-button');
}

function addRandomLinkListeners() {
  for (const a of scriptedLinkInfo.randomLinks ?? []) {
    a.addEventListener('click', evt => {
      if (!ready) {
        evt.preventDefault();
        return;
      }

      const tracks = albumData =>
        albumData
          .map(album => album.tracks)
          .reduce((acc, tracks) => acc.concat(tracks), []);

      setTimeout(() => {
        a.href = rebase('js-disabled');
      });

      switch (a.dataset.random) {
        case 'album':
          a.href = openAlbum(pick(albumData).directory);
          break;

        case 'album-in-official':
          a.href = openAlbum(pick(officialAlbumData).directory);
          break;

        case 'album-in-fandom':
          a.href = openAlbum(pick(fandomAlbumData).directory);
          break;

        case 'album-in-beyond':
          a.href = openAlbum(pick(beyondAlbumData).directory);
          break;

        case 'track':
          a.href = openTrack(getRefDirectory(pick(tracks(albumData))));
          break;

        case 'track-in-album':
          a.href = openTrack(getRefDirectory(pick(getAlbum(a).tracks)));
          break;

        case 'track-in-official':
          a.href = openTrack(getRefDirectory(pick(tracks(officialAlbumData))));
          break;

        case 'track-in-fandom':
          a.href = openTrack(getRefDirectory(pick(tracks(fandomAlbumData))));
          break;

        case 'track-in-beyond':
          a.href = openTrack(getRefDirectory(pick(tracks(beyondAlbumData))));
          break;

        case 'artist':
          a.href = openArtist(pick(artistData).directory);
          break;

        case 'artist-more-than-one-contrib':
          a.href =
            openArtist(
              pick(artistData.filter((artist) => getArtistNumContributions(artist) > 1))
                .directory);
          break;
      }
    });
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
        if (ready) {
          scriptedLinkInfo.randomNavLink?.click();
        }
      }
    }
  });
}

function addRevealLinkClickListeners() {
  for (const reveal of scriptedLinkInfo.revealLinks ?? []) {
    reveal.addEventListener('click', (event) => {
      if (!reveal.classList.contains('revealed')) {
        reveal.classList.add('revealed');
        event.preventDefault();
        event.stopPropagation();
        reveal.dispatchEvent(new CustomEvent('hsmusic-reveal'));
      }
    });
  }
}

clientSteps.getPageReferences.push(getScriptedLinkReferences);
clientSteps.addPageListeners.push(addRandomLinkListeners);
clientSteps.addPageListeners.push(addNavigationKeyPressListeners);
clientSteps.addPageListeners.push(addRevealLinkClickListeners);
clientSteps.mutatePageContent.push(mutateNavigationLinkContent);

const elements1 = document.getElementsByClassName('js-hide-once-data');
const elements2 = document.getElementsByClassName('js-show-once-data');

for (const element of elements1) element.style.display = 'block';

fetch(rebase('data.json', 'rebaseShared'))
  .then((data) => data.json())
  .then((data) => {
    albumData = data.albumData;
    artistData = data.artistData;

    const albumsInGroup = directory =>
      albumData
        .filter(album =>
          album.groups.includes(`group:${directory}`));

    officialAlbumData = albumsInGroup('official');
    fandomAlbumData = albumsInGroup('fandom');
    beyondAlbumData = albumsInGroup('beyond');

    for (const element of elements1) element.style.display = 'none';
    for (const element of elements2) element.style.display = 'block';

    ready = true;
  });

// Data & info card ---------------------------------------

/*
const NORMAL_HOVER_INFO_DELAY = 750;
const FAST_HOVER_INFO_DELAY = 250;
const END_FAST_HOVER_DELAY = 500;
const HIDE_HOVER_DELAY = 250;

let fastHover = false;
let endFastHoverTimeout = null;

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

function makeInfoCardLinkHandlers(type) {
  let hoverTimeout = null;

  return {
    mouseenter(evt) {
      hoverTimeout = setTimeout(
        () => {
          fastHover = true;
          infoCard.show(type, evt.target);
        },
        fastHover ? FAST_HOVER_INFO_DELAY : NORMAL_HOVER_INFO_DELAY);

      clearTimeout(endFastHoverTimeout);
      endFastHoverTimeout = null;

      infoCard.cancelHide();
    },

    mouseleave() {
      clearTimeout(hoverTimeout);

      if (fastHover && !endFastHoverTimeout) {
        endFastHoverTimeout = setTimeout(() => {
          endFastHoverTimeout = null;
          fastHover = false;
        }, END_FAST_HOVER_DELAY);
      }

      infoCard.readyHide();
    },
  };
}

const infoCardLinkHandlers = {
  track: makeInfoCardLinkHandlers('track'),
};

function addInfoCardLinkHandlers(type) {
  for (const a of document.querySelectorAll(`a[data-${type}]`)) {
    for (const [eventName, handler] of Object.entries(
      infoCardLinkHandlers[type]
    )) {
      a.addEventListener(eventName, handler);
    }
  }
}

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

const hashLinkInfo = clientInfo.hashLinkInfo = {
  links: null,
  hrefs: null,
  targets: null,

  state: {
    highlightedTarget: null,
    scrollingAfterClick: false,
    concludeScrollingStateInterval: null,
  },

  event: {
    whenHashLinkClicked: [],
  },
};

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

      for (const handler of event.whenHashLinkClicked) {
        handler({
          link: hashLink,
        });
      }
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

const stickyHeadingInfo = clientInfo.stickyHeadingInfo = {
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
    if (contentCover.getBoundingClientRect().bottom < 0) {
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

    for (const child of closestHeading.childNodes) {
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

  for (const handler of event.whenDisplayedHeadingChanges) {
    handler(index, {
      oldHeading: oldDisplayedHeading,
      newHeading: closestHeading,
    });
  }
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

function addImageOverlayClickHandlers() {
  const container = document.getElementById('image-overlay-container');

  if (!container) {
    console.warn(`#image-overlay-container missing, image overlay module disabled.`);
    return;
  }

  for (const link of document.querySelectorAll('.image-link')) {
    if (link.querySelector('img').hasAttribute('data-no-image-preview')) {
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

function handleImageLinkClicked(evt) {
  if (evt.metaKey || evt.shiftKey || evt.altKey) {
    return;
  }
  evt.preventDefault();

  const container = document.getElementById('image-overlay-container');
  container.classList.add('visible');
  container.classList.remove('loaded');
  container.classList.remove('errored');

  const allViewOriginal = document.getElementsByClassName('image-overlay-view-original');
  const mainImage = document.getElementById('image-overlay-image');
  const thumbImage = document.getElementById('image-overlay-image-thumb');

  const {href: originalSrc} = evt.target.closest('a');
  const {dataset: {
    originalSize: originalFileSize,
    thumbs: availableThumbList,
  }} = evt.target.closest('a').querySelector('img');

  updateFileSizeInformation(originalFileSize);

  let mainSrc = null;
  let thumbSrc = null;

  if (availableThumbList) {
    const {thumb: mainThumb, length: mainLength} = getPreferredThumbSize(availableThumbList);
    const {thumb: smallThumb, length: smallLength} = getSmallestThumbSize(availableThumbList);
    mainSrc = originalSrc.replace(/\.(jpg|png)$/, `.${mainThumb}.jpg`);
    thumbSrc = originalSrc.replace(/\.(jpg|png)$/, `.${smallThumb}.jpg`);
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

  container.style.setProperty('--download-progress', '0%');
  loadImage(mainSrc, progress => {
    container.style.setProperty('--download-progress', (20 + 0.8 * progress) + '%');
  }).then(
    blobUrl => {
      mainImage.src = blobUrl;
      container.style.setProperty('--download-progress', '100%');
    },
    handleMainImageErrored);

  function handleMainImageLoaded() {
    mainImage.removeEventListener('load', handleMainImageLoaded);
    mainImage.removeEventListener('error', handleMainImageErrored);
    container.classList.add('loaded');
  }

  function handleMainImageErrored() {
    mainImage.removeEventListener('load', handleMainImageLoaded);
    mainImage.removeEventListener('error', handleMainImageErrored);
    container.classList.add('errored');
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

/**
 * Credits: Parziphal, Feb 13, 2017
 * https://stackoverflow.com/a/42196770
 *
 * Loads an image with progress callback.
 *
 * The `onprogress` callback will be called by XMLHttpRequest's onprogress
 * event, and will receive the loading progress ratio as an whole number.
 * However, if it's not possible to compute the progress ratio, `onprogress`
 * will be called only once passing -1 as progress value. This is useful to,
 * for example, change the progress animation to an undefined animation.
 *
 * @param  {string}   imageUrl   The image to load
 * @param  {Function} onprogress
 * @return {Promise}
 */
function loadImage(imageUrl, onprogress) {
  return new Promise((resolve, reject) => {
    var xhr = new XMLHttpRequest();
    var notifiedNotComputable = false;

    xhr.open('GET', imageUrl, true);
    xhr.responseType = 'arraybuffer';

    xhr.onprogress = function(ev) {
      if (ev.lengthComputable) {
        onprogress(parseInt((ev.loaded / ev.total) * 1000) / 10);
      } else {
        if (!notifiedNotComputable) {
          notifiedNotComputable = true;
          onprogress(-1);
        }
      }
    }

    xhr.onloadend = function() {
      if (!xhr.status.toString().match(/^2/)) {
        reject(xhr);
      } else {
        if (!notifiedNotComputable) {
          onprogress(100);
        }

        var options = {}
        var headers = xhr.getAllResponseHeaders();
        var m = headers.match(/^Content-Type:\s*(.*?)$/mi);

        if (m && m[1]) {
          options.type = m[1];
        }

        var blob = new Blob([this.response], options);

        resolve(window.URL.createObjectURL(blob));
      }
    }

    xhr.send();
  });
}

// Group contributions table ------------------------------

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

// Sticky commentary sidebar ------------------------------

const albumCommentarySidebarInfo = clientInfo.albumCommentarySidebarInfo = {
  sidebar: null,

  sidebarTrackLinks: null,
  sidebarTrackDirectories: null,

  sidebarTrackSections: null,
  sidebarTrackSectionStartIndices: null,

  state: {
    currentTrackSection: null,
    currentTrackLink: null,
    justChangedTrackSection: false,
  },
};

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

  const linkDistanceFromSection =
    linkScrollTop - sectionTopEdge;

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
