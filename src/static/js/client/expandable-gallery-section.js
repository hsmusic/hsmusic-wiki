/* eslint-env browser */

// TODO: Combine this and quick-description.js

import {cssProp} from '../client-util.js';

import {stitchArrays} from '../../shared-util/sugar.js';

export const info = {
  id: 'expandableGallerySectionInfo',

  sections: null,

  sectionContentBelowCut: null,

  sectionExpandoToggles: null,

  sectionExpandCues: null,
  sectionCollapseCues: null,
};

export function getPageReferences() {
  info.sections =
    Array.from(document.querySelectorAll('.expandable-gallery-section'))
      .filter(section => section.querySelector('.section-expando-toggle'));

  info.sectionContentBelowCut =
    info.sections
      .map(section => section.querySelector('.section-content-below-cut'));

  info.sectionExpandoToggles =
    info.sections
      .map(section => section.querySelector('.section-expando-toggle'));

  info.sectionExpandCues =
    info.sections
      .map(section => section.querySelector('.section-expand-cue'));

  info.sectionCollapseCues =
    info.sections
      .map(section => section.querySelector('.section-collapse-cue'));
}

export function addPageListeners() {
  for (const {
    section,
    contentBelowCut,
    expandoToggle,
    expandCue,
    collapseCue,
  } of stitchArrays({
    section: info.sections,
    contentBelowCut: info.sectionContentBelowCut,
    expandoToggle: info.sectionExpandoToggles,
    expandCue: info.sectionExpandCues,
    collapseCue: info.sectionCollapseCues,
  })) {
    expandoToggle.addEventListener('click', domEvent => {
      domEvent.preventDefault();

      const collapsed =
        cssProp(contentBelowCut, 'display') === 'none';

      if (collapsed) {
        section.classList.add('expanded');
        cssProp(contentBelowCut, 'display', null);
        cssProp(expandCue, 'display', 'none');
        cssProp(collapseCue, 'display', null);
      } else {
        section.classList.remove('expanded');
        cssProp(contentBelowCut, 'display', 'none');
        cssProp(expandCue, 'display', null);
        cssProp(collapseCue, 'display', 'none');
      }
    });
  }
}
