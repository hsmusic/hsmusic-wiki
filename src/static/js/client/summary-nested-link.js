/* eslint-env browser */

import {
  empty,
  filterMultipleArrays,
  stitchArrays,
} from '../../shared-util/sugar.js';

export const info = {
  id: 'summaryNestedLinkInfo',

  summaries: null,
  links: null,
};

export function getPageReferences() {
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

export function addPageListeners() {
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
