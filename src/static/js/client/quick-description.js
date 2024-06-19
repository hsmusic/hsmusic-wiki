/* eslint-env browser */

import {stitchArrays} from '../../shared-util/sugar.js';

export const info = {
  id: 'quickDescriptionInfo',

  quickDescriptionContainers: null,

  quickDescriptionsAreExpandable: null,

  expandDescriptionLinks: null,
  collapseDescriptionLinks: null,
};

export function getPageReferences() {
  info.quickDescriptionContainers =
    Array.from(document.querySelectorAll('#content .quick-description'));

  info.quickDescriptionsAreExpandable =
    info.quickDescriptionContainers
      .map(container =>
        container.querySelector('.quick-description-actions.when-expanded'));

  info.expandDescriptionLinks =
    info.quickDescriptionContainers
      .map(container =>
        container.querySelector('.quick-description-actions .expand-link'));

  info.collapseDescriptionLinks =
    info.quickDescriptionContainers
      .map(container =>
        container.querySelector('.quick-description-actions .collapse-link'));
}

export function addPageListeners() {
  for (const {
    isExpandable,
    container,
    expandLink,
    collapseLink,
  } of stitchArrays({
    isExpandable: info.quickDescriptionsAreExpandable,
    container: info.quickDescriptionContainers,
    expandLink: info.expandDescriptionLinks,
    collapseLink: info.collapseDescriptionLinks,
  })) {
    if (!isExpandable) continue;

    expandLink.addEventListener('click', event => {
      event.preventDefault();
      container.classList.add('expanded');
      container.classList.remove('collapsed');
    });

    collapseLink.addEventListener('click', event => {
      event.preventDefault();
      container.classList.add('collapsed');
      container.classList.remove('expanded');
    });
  }
}
