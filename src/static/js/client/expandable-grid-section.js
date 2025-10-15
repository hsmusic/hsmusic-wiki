import {cssProp} from '../client-util.js';

import {stitchArrays} from '../../shared-util/sugar.js';

export const info = {
  id: 'expandableGallerySectionInfo',

  items: null,
  toggles: null,
  expandCues: null,
  collapseCues: null,
};

export function getPageReferences() {
  const expandos =
    Array.from(document.querySelectorAll('.grid-expando'));

  const grids =
    expandos
      .map(expando => expando.closest('.grid-listing'));

  info.items =
    grids
      .map(grid => grid.querySelectorAll('.grid-item'))
      .map(items => Array.from(items));

  info.toggles =
    expandos
      .map(expando => expando.querySelector('.grid-expando-toggle'));

  info.expandCues =
    info.toggles
      .map(toggle => toggle.querySelector('.grid-expand-cue'));

  info.collapseCues =
    info.toggles
      .map(toggle => toggle.querySelector('.grid-collapse-cue'));
}

export function addPageListeners() {
  stitchArrays({
    items: info.items,
    toggle: info.toggles,
    expandCue: info.expandCues,
    collapseCue: info.collapseCues,
  }).forEach(({
      items,
      toggle,
      expandCue,
      collapseCue,
    }) => {
      toggle.addEventListener('click', domEvent => {
        domEvent.preventDefault();

        const collapsed =
          items.some(item =>
            item.classList.contains('hidden-by-expandable-cut'));

        for (const item of items) {
          if (
            !item.classList.contains('hidden-by-expandable-cut') &&
            !item.classList.contains('shown-by-expandable-cut')
          ) continue;

          if (collapsed) {
            item.classList.remove('hidden-by-expandable-cut');
            item.classList.add('shown-by-expandable-cut');
          } else {
            item.classList.add('hidden-by-expandable-cut');
            item.classList.remove('shown-by-expandable-cut');
          }
        }

        if (collapsed) {
          cssProp(expandCue, 'display', 'none');
          cssProp(collapseCue, 'display', null);
        } else {
          cssProp(expandCue, 'display', null);
          cssProp(collapseCue, 'display', 'none');
        }
      });
    });
}
