/* eslint-env browser */

import {stitchArrays} from '../../shared-util/sugar.js';

import {cssProp} from '../client-util.js';

export const info = {
  id: 'lyricsSwitcherInfo',

  entries: null,
  switchLinks: null,
  currentLinks: null,
};

export function getPageReferences() {
  const content = document.getElementById('content');

  if (!content) return;

  const switcher = content.querySelector('.lyrics-switcher');

  if (!switcher) return;

  info.entries =
    Array.from(content.querySelectorAll('.lyrics-entry'));

  info.currentLinks =
    Array.from(switcher.querySelectorAll('a.current'));

  info.switchLinks =
    Array.from(switcher.querySelectorAll('a:not(.current)'));
}

export function addPageListeners() {
  if (!info.switchLinks) return;

  for (const {switchLink, entry} of stitchArrays({
    switchLink: info.switchLinks,
    entry: info.entries,
  })) {
    switchLink.addEventListener('click', domEvent => {
      domEvent.preventDefault();
      showLyricsEntry(entry);
    });
  }
}

function showLyricsEntry(entry) {
  const entryToShow = entry;

  stitchArrays({
    entry: info.entries,
    currentLink: info.currentLinks,
    switchLink: info.switchLinks,
  }).forEach(({
      entry,
      currentLink,
      switchLink,
    }) => {
      if (entry === entryToShow) {
        cssProp(entry, 'display', null);
        cssProp(currentLink, 'display', null);
        cssProp(switchLink, 'display', 'none');
      } else {
        cssProp(entry, 'display', 'none');
        cssProp(currentLink, 'display', 'none');
        cssProp(switchLink, 'display', null);
      }
    });
}
