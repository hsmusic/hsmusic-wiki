/* eslint-env browser */

// This is the JS file that gets loaded on the client! It's only really used for
// the random track feature right now - the idea is we only use it for stuff
// that cannot 8e done at static-site compile time, 8y its fundamentally
// ephemeral nature.
//
// Upd8: As of 04/02/2021, it's now used for info cards too! Nice.

import {getColors} from '../util/colors.js';

import {getArtistNumContributions} from '../util/wiki-data.js';

let albumData, artistData;
let officialAlbumData, fandomAlbumData;

let ready = false;

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

for (const a of document.body.querySelectorAll('[data-random]')) {
  a.addEventListener('click', (evt) => {
    if (!ready) {
      evt.preventDefault();
      return;
    }

    setTimeout(() => {
      a.href = rebase('js-disabled');
    });
    switch (a.dataset.random) {
      case 'album':
        return (a.href = openAlbum(pick(albumData).directory));
      case 'album-in-fandom':
        return (a.href = openAlbum(pick(fandomAlbumData).directory));
      case 'album-in-official':
        return (a.href = openAlbum(pick(officialAlbumData).directory));
      case 'track':
        return (a.href = openTrack(
          getRefDirectory(
            pick(
              albumData.map((a) => a.tracks).reduce((a, b) => a.concat(b), [])
            )
          )
        ));
      case 'track-in-album':
        return (a.href = openTrack(getRefDirectory(pick(getAlbum(a).tracks))));
      case 'track-in-fandom':
        return (a.href = openTrack(
          getRefDirectory(
            pick(
              fandomAlbumData.reduce(
                (acc, album) => acc.concat(album.tracks),
                []
              )
            )
          )
        ));
      case 'track-in-official':
        return (a.href = openTrack(
          getRefDirectory(
            pick(
              officialAlbumData.reduce(
                (acc, album) => acc.concat(album.tracks),
                []
              )
            )
          )
        ));
      case 'artist':
        return (a.href = openArtist(pick(artistData).directory));
      case 'artist-more-than-one-contrib':
        return (a.href = openArtist(
          pick(
            artistData.filter((artist) => getArtistNumContributions(artist) > 1)
          ).directory
        ));
    }
  });
}

const next = document.getElementById('next-button');
const previous = document.getElementById('previous-button');
const random = document.getElementById('random-button');

const prependTitle = (el, prepend) => {
  const existing = el.getAttribute('title');
  if (existing) {
    el.setAttribute('title', prepend + ' ' + existing);
  } else {
    el.setAttribute('title', prepend);
  }
};

if (next) prependTitle(next, '(Shift+N)');
if (previous) prependTitle(previous, '(Shift+P)');
if (random) prependTitle(random, '(Shift+R)');

document.addEventListener('keypress', (event) => {
  if (event.shiftKey) {
    if (event.charCode === 'N'.charCodeAt(0)) {
      if (next) next.click();
    } else if (event.charCode === 'P'.charCodeAt(0)) {
      if (previous) previous.click();
    } else if (event.charCode === 'R'.charCodeAt(0)) {
      if (random && ready) random.click();
    }
  }
});

for (const reveal of document.querySelectorAll('.reveal')) {
  reveal.addEventListener('click', (event) => {
    if (!reveal.classList.contains('revealed')) {
      reveal.classList.add('revealed');
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

const elements1 = document.getElementsByClassName('js-hide-once-data');
const elements2 = document.getElementsByClassName('js-show-once-data');

for (const element of elements1) element.style.display = 'block';

fetch(rebase('data.json', 'rebaseShared'))
  .then((data) => data.json())
  .then((data) => {
    albumData = data.albumData;
    artistData = data.artistData;

    officialAlbumData = albumData.filter((album) =>
      album.groups.includes('group:official')
    );
    fandomAlbumData = albumData.filter(
      (album) => !album.groups.includes('group:official')
    );

    for (const element of elements1) element.style.display = 'none';
    for (const element of elements2) element.style.display = 'block';

    ready = true;
  });

// Data & info card ---------------------------------------

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

// Custom hash links --------------------------------------

function addHashLinkHandlers() {
  // Instead of defining a scroll offset (to account for the sticky heading)
  // in JavaScript, we interface with the CSS property 'scroll-margin-top'.
  // This lets the scroll offset be consolidated where it makes sense, and
  // sets an appropriate offset when (re)loading a page with hash for free!

  let wasHighlighted;

  for (const a of document.links) {
    const href = a.getAttribute('href');
    if (!href || !href.startsWith('#')) {
      continue;
    }

    a.addEventListener('click', handleHashLinkClicked);
  }

  function handleHashLinkClicked(evt) {
    if (evt.metaKey || evt.shiftKey || evt.ctrlKey || evt.altKey) {
      return;
    }

    const href = evt.target.getAttribute('href');
    const id = href.slice(1);
    const linked = document.getElementById(id);

    if (!linked) {
      return;
    }

    // Hide skipper box right away, so the layout is updated on time for the
    // math operations coming up next.
    const skipper = document.getElementById('skippers');
    skipper.style.display = 'none';
    setTimeout(() => skipper.style.display = '');

    const box = linked.getBoundingClientRect();
    const style = window.getComputedStyle(linked);

    const scrollY =
        window.scrollY
      + box.top
      - style['scroll-margin-top'].replace('px', '');

    evt.preventDefault();
    history.pushState({}, '', href);
    window.scrollTo({top: scrollY, behavior: 'smooth'});
    linked.focus({preventScroll: true});

    const maxScroll =
        document.body.scrollHeight
      - window.innerHeight;

    if (scrollY > maxScroll && linked.classList.contains('content-heading')) {
      if (wasHighlighted) {
        wasHighlighted.classList.remove('highlight-hash-link');
      }

      wasHighlighted = linked;
      linked.classList.add('highlight-hash-link');
      linked.addEventListener('animationend', function handle(evt) {
        if (evt.animationName === 'highlight-hash-link') {
          linked.removeEventListener('animationend', handle);
          linked.classList.remove('highlight-hash-link');
          wasHighlighted = null;
        }
      });
    }
  }
}

addHashLinkHandlers();

// Sticky content heading ---------------------------------

const stickyHeadingInfo = Array.from(document.querySelectorAll('.content-sticky-heading-container'))
  .map(stickyContainer => {
    const {parentElement: contentContainer} = stickyContainer;
    const stickySubheadingRow = stickyContainer.querySelector('.content-sticky-subheading-row');
    const stickySubheading = stickySubheadingRow.querySelector('h2');
    const stickyCoverContainer = stickyContainer.querySelector('.content-sticky-heading-cover-container');
    const contentHeadings = Array.from(contentContainer.querySelectorAll('.content-heading'));
    const contentCover = contentContainer.querySelector('#cover-art-container');

    return {
      contentContainer,
      contentCover,
      contentHeadings,
      stickyContainer,
      stickyCoverContainer,
      stickySubheading,
      stickySubheadingRow,
      state: {
        displayedHeading: null,
      },
    };
  });

const topOfViewInside = (el, scroll = window.scrollY) => (
  scroll > el.offsetTop &&
  scroll < el.offsetTop + el.offsetHeight
);

function updateStickyHeading() {
  for (const {
    contentContainer,
    contentCover,
    contentHeadings,
    stickyContainer,
    stickyCoverContainer,
    stickySubheading,
    stickySubheadingRow,
    state,
  } of stickyHeadingInfo) {
    let closestHeading = null;

    if (contentCover && stickyCoverContainer) {
      if (contentCover.getBoundingClientRect().bottom < 0) {
        stickyCoverContainer.classList.add('visible');
      } else {
        stickyCoverContainer.classList.remove('visible');
      }
    }

    if (topOfViewInside(contentContainer)) {
      if (stickySubheading.childNodes.length === 0) {
        // &nbsp; to ensure correct basic line height
        stickySubheading.appendChild(document.createTextNode('\xA0'));
      }

      const stickyRect = stickyContainer.getBoundingClientRect();
      const subheadingRect = stickySubheading.getBoundingClientRect();
      const stickyBottom = stickyRect.bottom + subheadingRect.height;

      // This array is reversed so that we're starting from the bottom when
      // iterating over it.
      for (let i = contentHeadings.length - 1; i >= 0; i--) {
        const heading = contentHeadings[i];
        const headingRect = heading.getBoundingClientRect();
        if (headingRect.y + headingRect.height / 1.5 < stickyBottom + 20) {
          closestHeading = heading;
          break;
        }
      }
    }

    if (state.displayedHeading !== closestHeading) {
      if (closestHeading) {
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

      state.displayedHeading = closestHeading;
    }
  }
}

document.addEventListener('scroll', updateStickyHeading);

updateStickyHeading();

// Image overlay ------------------------------------------

function addImageOverlayClickHandlers() {
  for (const img of document.querySelectorAll('.image-link')) {
    img.addEventListener('click', handleImageLinkClicked);
  }

  const container = document.getElementById('image-overlay-container');
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

  const source = evt.target.closest('a').href;
  mainImage.src = source.replace(/\.(jpg|png)$/, '.huge.jpg');
  thumbImage.src = source.replace(/\.(jpg|png)$/, '.small.jpg');
  for (const viewOriginal of allViewOriginal) {
    viewOriginal.href = source;
  }

  const fileSize = evt.target.closest('a').querySelector('img').dataset.originalSize;
  updateFileSizeInformation(fileSize);

  mainImage.addEventListener('load', handleMainImageLoaded);
  mainImage.addEventListener('error', handleMainImageErrored);

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
  console.log(round(3));

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
