/* eslint-env browser */

import {cssProp} from '../client-util.js';

import {info as hashLinkInfo} from './hash-link.js';

export const info = {
  id: 'additionalNamesBoxInfo',

  box: null,
  links: null,
  mainContentContainer: null,

  state: {
    visible: false,
  },
};

export function getPageReferences() {
  info.box =
    document.getElementById('additional-names-box');

  info.links =
    document.querySelectorAll('a[href="#additional-names-box"]');

  info.mainContentContainer =
    document.querySelector('#content .main-content-container');
}

export function addInternalListeners() {
  hashLinkInfo.event.beforeHashLinkScrolls.push(({target}) => {
    if (target === info.box) {
      return false;
    }
  });
}

export function addPageListeners() {
  for (const link of info.links) {
    link.addEventListener('click', domEvent => {
      handleAdditionalNamesBoxLinkClicked(domEvent);
    });
  }
}

function handleAdditionalNamesBoxLinkClicked(domEvent) {
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

export function toggleAdditionalNamesBox() {
  const {state} = info;

  state.visible = !state.visible;
  info.box.style.display =
    (state.visible
      ? 'block'
      : 'none');
}
