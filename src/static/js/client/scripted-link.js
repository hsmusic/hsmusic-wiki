/* eslint-env browser */

import {pick, stitchArrays} from '../../shared-util/sugar.js';

import {
  cssProp,
  rebase,
  openAlbum,
  openArtist,
  openTrack,
} from '../client-util.js';

export const info = {
  id: 'scriptedLinkInfo',

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
};

export function getPageReferences() {
  info.randomLinks =
    document.querySelectorAll('[data-random]');

  info.revealLinks =
    document.querySelectorAll('.reveal .image-outer-area > *');

  info.revealContainers =
    Array.from(info.revealLinks)
      .map(link => link.closest('.reveal'));

  info.nextNavLink =
    document.getElementById('next-button');

  info.previousNavLink =
    document.getElementById('previous-button');

  info.randomNavLink =
    document.getElementById('random-button');
}

export function addPageListeners() {
  addRandomLinkListeners();
  addNavigationKeyPressListeners();
  addRevealLinkClickListeners();
}

function addRandomLinkListeners() {
  for (const a of info.randomLinks ?? []) {
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
  const {state} = info;

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

export function mutatePageContent() {
  mutateNavigationLinkContent();
}

function mutateNavigationLinkContent() {
  const prependTitle = (el, prepend) => {
    if (!el) return;
    if (!el.hasAttribute('href')) return;

    el?.setAttribute(
      'title',
      (el.hasAttribute('title')
        ? prepend + ' ' + el.getAttribute('title')
        : prepend));
  };

  prependTitle(info.nextNavLink, '(Shift+N)');
  prependTitle(info.previousNavLink, '(Shift+P)');
  prependTitle(info.randomNavLink, '(Shift+R)');
}

function addNavigationKeyPressListeners() {
  document.addEventListener('keypress', (event) => {
    if (event.shiftKey) {
      if (event.charCode === 'N'.charCodeAt(0)) {
        info.nextNavLink?.click();
      } else if (event.charCode === 'P'.charCodeAt(0)) {
        info.previousNavLink?.click();
      } else if (event.charCode === 'R'.charCodeAt(0)) {
        info.randomNavLink?.click();
      }
    }
  });
}

function addRevealLinkClickListeners() {
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
      const {state} = info;

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
      for (const a of info.randomLinks) {
        const href = determineRandomLinkHref(a);
        if (!href) {
          a.removeAttribute('href');
        }
      }
    });
}
