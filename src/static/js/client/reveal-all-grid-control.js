import {cssProp} from '../client-util.js';

export const info = {
  id: 'revealAllGridControlInfo',

  revealAllLinks: null,
  revealables: null,

  revealLabels: null,
  concealLabels: null,
};

export function getPageReferences() {
  info.revealAllLinks =
    Array.from(document.querySelectorAll('.reveal-all a'));

  info.revealables =
    info.revealAllLinks
      .map(link => link.closest('.grid-listing'))
      .map(listing => listing.querySelectorAll('.reveal'));

  info.revealLabels =
    info.revealAllLinks
      .map(link => link.querySelector('.reveal-label'));

  info.concealLabels =
    info.revealAllLinks
      .map(link => link.querySelector('.conceal-label'));
}

export function addPageListeners() {
  for (const [index, link] of info.revealAllLinks.entries()) {
    link.addEventListener('click', domEvent => {
      domEvent.preventDefault();
      handleRevealAllLinkClicked(index);
    });
  }
}

export function addInternalListeners() {
  // Don't even think about it. "Reveal all artworks" is a stable control,
  // meaning it only changes because the user interacted with it directly.
}

function handleRevealAllLinkClicked(index) {
  const revealables = info.revealables[index];
  const revealLabel = info.revealLabels[index];
  const concealLabel = info.concealLabels[index];

  const shouldReveal =
    (cssProp(revealLabel, 'display') === 'none'
      ? false
      : true);

  for (const revealable of revealables) {
    if (shouldReveal) {
      revealable.classList.add('revealed');
    } else {
      revealable.classList.remove('revealed');
    }
  }

  if (shouldReveal) {
    cssProp(revealLabel, 'display', 'none');
    cssProp(concealLabel, 'display', null);
  } else {
    cssProp(revealLabel, 'display', null);
    cssProp(concealLabel, 'display', 'none');
  }
}
