/* eslint-env browser */

import {stitchArrays} from '../../shared-util/sugar.js';

import {registerTooltipElement, registerTooltipHoverableElement}
  from './hoverable-tooltip.js';

export const info = {
  id: 'textWithTooltipInfo',

  hoverables: null,
  tooltips: null,
};

export function getPageReferences() {
  const spans =
    Array.from(document.querySelectorAll('.text-with-tooltip'));

  info.hoverables =
    spans.map(span => span.children[0]);

  info.tooltips =
    spans.map(span => span.children[1]);
}

export function addPageListeners() {
  for (const {hoverable, tooltip} of stitchArrays({
    hoverable: info.hoverables,
    tooltip: info.tooltips,
  })) {
    registerTooltipElement(tooltip);
    registerTooltipHoverableElement(hoverable, tooltip);
  }
}
