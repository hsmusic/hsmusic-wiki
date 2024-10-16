/* eslint-env browser */

import {stitchArrays} from '../../shared-util/sugar.js';

import {cssProp} from '../client-util.js';

export const info = {
  id: 'intrapageDotSwitcherInfo',

  // Each is a two-level array, by switcher.
  // This is an evil data structure.
  switcherSpans: null,
  switcherLinks: null,
  switcherTargets: null,
};

export function getPageReferences() {
  const switchers =
    Array.from(document.querySelectorAll('.dot-switcher.intrapage'));

  info.switcherSpans =
    switchers
      .map(switcher => switcher.querySelectorAll(':scope > span'))
      .map(spans => Array.from(spans));

  info.switcherLinks =
    info.switcherSpans
      .map(spans => spans
        .map(span => span.querySelector(':scope > a')));

  info.switcherTargets =
    info.switcherLinks
      .map(links => links
        .map(link => {
          const targetID = link.getAttribute('data-target-id');
          const target = document.getElementById(targetID);
          if (target) {
            return target;
          } else {
            console.warn(
              `An intrapage dot switcher option is targetting an ID that doesn't exist, #${targetID}`,
              link);
            link.setAttribute('inert', '');
            return null;
          }
        }));
}

export function addPageListeners() {
  for (const {links, spans, targets} of stitchArrays({
    spans: info.switcherSpans,
    links: info.switcherLinks,
    targets: info.switcherTargets,
  })) {
    for (const [index, {span, link, target}] of stitchArrays({
      span: spans,
      link: links,
      target: targets,
    }).entries()) {
      const otherSpans =
        [...spans.slice(0, index), ...spans.slice(index + 1)];

      const otherTargets =
        [...targets.slice(0, index), ...targets.slice(index + 1)];

      link.addEventListener('click', domEvent => {
        domEvent.preventDefault();

        for (const otherSpan of otherSpans) {
          otherSpan.classList.remove('current');
        }

        for (const otherTarget of otherTargets) {
          cssProp(otherTarget, 'display', 'none');
        }

        span.classList.add('current');
        cssProp(target, 'display', 'block');
      });
    }
  }
}
