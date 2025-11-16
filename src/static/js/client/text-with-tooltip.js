import {stitchArrays} from '../../shared-util/sugar.js';

import {registerTooltipElement, registerTooltipHoverableElement}
  from './hoverable-tooltip.js';

export const info = {
  id: 'textWithTooltipInfo',

  spans: null,
  hoverables: null,
  tooltips: null,
};

export function getPageReferences() {
  info.spans =
    Array.from(document.querySelectorAll('.text-with-tooltip'));

  info.hoverables =
    info.spans.map(span => span.children[0]);

  info.tooltips =
    info.spans.map(span => span.children[1]);
}

export function addPageListeners() {
  for (const {span, hoverable, tooltip} of stitchArrays({
    span: info.spans,
    hoverable: info.hoverables,
    tooltip: info.tooltips,
  })) {
    if (span.classList.contains('unready')) continue;
    if (span.classList.contains('readied')) continue;
    registerTooltipElement(tooltip);
    registerTooltipHoverableElement(hoverable, tooltip);
  }
}

export function readyPreparedTextWithTooltip(el) {
  const twt = el.closest('.text-with-tooltip');

  if (!twt) {
    throw new Error(`no containing text-with-tooltip found`);
  }

  let {classList, children} = twt;
  children = Array.from(children);

  if (classList.contains('readied')) {
    console.warn(`text-with-tooltip has already been readied`);
    return;
  }

  if (!classList.contains('unready')) {
    console.warn(
      `text-with-tooltop not indicated as unready\n` +
      `probably missing {requiresTooltipContentFromClient: true} slot`);
    return;
  }

  const hoverable = info.hoverables.find(el => children.includes(el));
  const tooltip = info.tooltips.find(el => children.includes(el));

  registerTooltipElement(tooltip);
  registerTooltipHoverableElement(hoverable, tooltip);

  classList.remove('unready');
  classList.add('readied');
}
