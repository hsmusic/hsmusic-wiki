import {cssProp} from '../client-util.js';

import {stitchArrays} from '../../shared-util/sugar.js';

export const info = {
  id: 'galleryStyleSelectorInfo',

  selectors: null,
  sections: null,

  selectorStyleInputs: null,
  selectorStyleInputStyles: null,

  selectorReleaseItems: null,
  selectorReleaseItemStyles: null,

  selectorCountAll: null,
  selectorCountFiltered: null,
  selectorCountFilteredCount: null,
  selectorCountNone: null,
};

export function getPageReferences() {
  info.selectors =
    Array.from(document.querySelectorAll('.gallery-style-selector'));

  info.sections =
    info.selectors
      .map(selector => selector.closest('section'));

  info.selectorStyleInputs =
    info.selectors
      .map(selector => selector.querySelectorAll('.styles input'))
      .map(inputs => Array.from(inputs));

  info.selectorStyleInputStyles =
    info.selectorStyleInputs
      .map(inputs => inputs
        .map(input => input.closest('label').dataset.style));

  info.selectorReleaseItems =
    info.sections
      .map(section => section.querySelectorAll('.grid-item'))
      .map(items => Array.from(items));

  info.selectorReleaseItemStyles =
    info.selectorReleaseItems
      .map(items => items
        .map(item => item.dataset.style));

  info.selectorCountAll =
    info.selectors
      .map(selector => selector.querySelector('.count.all'));

  info.selectorCountFiltered =
    info.selectors
      .map(selector => selector.querySelector('.count.filtered'));

  info.selectorCountFilteredCount =
    info.selectorCountFiltered
      .map(selector => selector.querySelector('span'));

  info.selectorCountNone =
    info.selectors
      .map(selector => selector.querySelector('.count.none'));
}

export function addPageListeners() {
  for (const index of info.selectors.keys()) {
    for (const input of info.selectorStyleInputs[index]) {
      input.addEventListener('input', () => updateVisibleReleases(index));
    }
  }
}

function updateVisibleReleases(index) {
  const inputs = info.selectorStyleInputs[index];
  const inputStyles = info.selectorStyleInputStyles[index];

  const selectedStyles =
    stitchArrays({input: inputs, style: inputStyles})
      .filter(({input}) => input.checked)
      .map(({style}) => style);

  const releases = info.selectorReleaseItems[index];
  const releaseStyles = info.selectorReleaseItemStyles[index];

  let visible = 0;

  stitchArrays({
    release: releases,
    style: releaseStyles,
  }).forEach(({release, style}) => {
      if (selectedStyles.includes(style)) {
        release.classList.remove('hidden-by-style-mismatch');
        visible++;
      } else {
        release.classList.add('hidden-by-style-mismatch');
      }
    });

  const countAll = info.selectorCountAll[index];
  const countFiltered = info.selectorCountFiltered[index];
  const countFilteredCount = info.selectorCountFilteredCount[index];
  const countNone = info.selectorCountNone[index];

  if (visible === releases.length) {
    cssProp(countAll, 'display', null);
    cssProp(countFiltered, 'display', 'none');
    cssProp(countNone, 'display', 'none');
  } else if (visible === 0) {
    cssProp(countAll, 'display', 'none');
    cssProp(countFiltered, 'display', 'none');
    cssProp(countNone, 'display', null);
  } else {
    cssProp(countAll, 'display', 'none');
    cssProp(countFiltered, 'display', null);
    cssProp(countNone, 'display', 'none');
    countFilteredCount.innerHTML = visible;
  }
}
