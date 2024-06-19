/* eslint-env browser */

// TODO: Maybe datetimestamps can just be incorporated into text-with-tooltip?

import {stitchArrays} from '../../shared-util/sugar.js';

import {registerTooltipElement, registerTooltipHoverableElement}
  from './hoverable-tooltip.js';

export const info = {
  id: 'datetimestampTooltipInfo',

  hoverables: null,
  tooltips: null,
};

export function getPageReferences() {
  const spans =
    Array.from(document.querySelectorAll('span.datetimestamp.has-tooltip'));

  info.hoverables =
    spans.map(span => span.querySelector('time'));

  info.tooltips =
    spans.map(span => span.querySelector('span.datetimestamp-tooltip'));
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
