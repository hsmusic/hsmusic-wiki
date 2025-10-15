import {cssProp} from '../client-util.js';

import {info as hashLinkInfo} from './hash-link.js';
import {info as stickyHeadingInfo} from './sticky-heading.js';

export const info = {
  id: 'additionalNamesBoxInfo',

  box: null,

  links: null,
  stickyHeadingLink: null,

  contentContainer: null,
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

  info.stickyHeadingLink =
    document.querySelector(
      '.content-sticky-heading-container' +
      ' ' +
      'a[href="#additional-names-box"]' +
      ':not(:where([inert] *))');

  info.contentContainer =
    document.querySelector('#content');

  info.mainContentContainer =
    document.querySelector('#content .main-content-container');
}

export function addInternalListeners() {
  hashLinkInfo.event.beforeHashLinkScrolls.push(({target}) => {
    if (target === info.box) {
      return false;
    }
  });

  stickyHeadingInfo.event.whenStuckStatusChanges.push((index, stuck) => {
    const {state} = info;

    if (!info.stickyHeadingLink) return;

    const container = stickyHeadingInfo.contentContainers[index];
    if (container !== info.contentContainer) return;

    if (stuck) {
      if (!state.visible) {
        info.stickyHeadingLink.removeAttribute('href');

        if (info.stickyHeadingLink.hasAttribute('title')) {
          info.stickyHeadingLink.dataset.restoreTitle = info.stickyHeadingLink.getAttribute('title');
          info.stickyHeadingLink.removeAttribute('title');
        }
      }
    } else {
      info.stickyHeadingLink.setAttribute('href', '#additional-names-box');

      const {restoreTitle} = info.stickyHeadingLink.dataset;
      if (restoreTitle) {
        info.stickyHeadingLink.setAttribute('title', restoreTitle);
        delete info.stickyHeadingLink.dataset.restoreTitle;
      }
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

  if (!domEvent.target.hasAttribute('href')) return;
  if (!info.box || !info.mainContentContainer) return;

  const margin =
    +(cssProp(info.box, 'scroll-margin-top').replace('px', ''));

  const {top} =
    (state.visible
      ? info.box.getBoundingClientRect()
      : info.mainContentContainer.getBoundingClientRect());

  const {bottom, height} =
    (state.visible
      ? info.box.getBoundingClientRect()
      : {bottom: null});

  const boxFitsInFrame =
    (height
      ? height < window.innerHeight - margin - 60
      : null);

  const worthScrolling =
    top + 20 < margin ||

    (height && boxFitsInFrame
      ? top > 0.7 * window.innerHeight
   : height && !boxFitsInFrame
      ? top > 0.4 * window.innerHeight
      : top > 0.5 * window.innerHeight) ||

    (bottom && boxFitsInFrame
      ? bottom > window.innerHeight - 20
      : false);

  if (worthScrolling) {
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
