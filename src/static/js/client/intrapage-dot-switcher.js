import {stitchArrays} from '../../shared-util/sugar.js';

import {cssProp} from '../client-util.js';

export const info = {
  id: 'intrapageDotSwitcherInfo',

  switcherMemorableIDs: null,

  // Each is a two-level array, by switcher.
  // This is an evil data structure.
  switcherSpans: null,
  switcherLinks: null,
  switcherTargets: null,
  switcherMemorableValuesViaLinkText: null,
  switcherMemorableValuesViaSpanText: null,

  session: {
    switcherChoicesViaLinkText: {
      type: 'json',
      maxLength: settings => settings.maxSwitcherChoiceStorage,
    },

    switcherChoicesViaSpanText: {
      type: 'json',
      maxLength: settings => settings.maxSwitcherChoiceStorage,
    },
  },

  settings: {
    maxSwitcherChoiceStorage: 1000,
  },
};

export function getPageReferences() {
  const switchers =
    Array.from(document.querySelectorAll('.dot-switcher.intrapage'));

  info.switcherMemorableIDs =
    switchers
      .map(switcher => switcher.getAttribute('data-memorable-id'));

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

  info.switcherMemorableValuesViaLinkText =
    info.switcherLinks
      .map(links => links
        .map(link => link.innerText));

  info.switcherMemorableValuesViaSpanText =
    info.switcherSpans
      .map(links => links
        .map(link => link.innerText));
}

export function mutatePageContent() {
  const {session} = info;

  if (
    !session.switcherChoicesViaLinkText &&
    !session.switcherChoicesViaSpanText
  ) return;

  stitchArrays({
    memorableID: info.switcherMemorableIDs,
    memorableValuesViaLinkText: info.switcherMemorableValuesViaLinkText,
    memorableValuesViaSpanText: info.switcherMemorableValuesViaSpanText,
    spans: info.switcherSpans,
    targets: info.switcherTargets,
  }).forEach(({
    memorableID,
    memorableValuesViaLinkText,
    memorableValuesViaSpanText,
    spans,
    targets,
  }) => {
    const choiceViaLinkText = session.switcherChoicesViaLinkText[memorableID];
    const choiceViaSpanText = session.switcherChoicesViaSpanText[memorableID];

    if (!choiceViaLinkText && !choiceViaSpanText) return;

    const matchesViaLinkText =
      Array.from(memorableValuesViaLinkText.entries())
        .filter(([_index, value]) => value === choiceViaLinkText);

    const matchesViaSpanText =
      Array.from(memorableValuesViaSpanText.entries())
        .filter(([_index, value]) => value === choiceViaSpanText);

    const [bestMatchIndex] =
      (matchesViaLinkText.length === 1
        ? matchesViaLinkText.at(0)
     : matchesViaSpanText.length >= 1
        ? matchesViaSpanText.at(0)
     : matchesViaLinkText.length > 1
        ? matchesViaLinkText.at(0)
        : [-1, null]);

    if (bestMatchIndex === -1) {
      return;
    }

    stitchArrays({
      span: spans,
      target: targets,
    }).forEach(({
      span,
      target,
    }, index) => {
      if (index === bestMatchIndex) {
        span.classList.add('current');
        cssProp(target, 'display', 'block');
      } else {
        span.classList.remove('current');
        cssProp(target, 'display', 'none');
      }
    });
  });
}

export function addPageListeners() {
  const {session} = info;

  stitchArrays({
    memorableID: info.switcherMemorableIDs,
    memorableValuesViaLinkText: info.switcherMemorableValuesViaLinkText,
    memorableValuesViaSpanText: info.switcherMemorableValuesViaSpanText,
    spans: info.switcherSpans,
    links: info.switcherLinks,
    targets: info.switcherTargets,
  }).forEach(({
    memorableID,
    memorableValuesViaLinkText,
    memorableValuesViaSpanText,
    links,
    spans,
    targets,
  }) => {
    stitchArrays({
      memorableValueViaLinkText: memorableValuesViaLinkText,
      memorableValueViaSpanText: memorableValuesViaSpanText,
      span: spans,
      link: links,
      target: targets,
    }).forEach(({
      memorableValueViaLinkText,
      memorableValueViaSpanText,
      span,
      link,
      target,
    }, index) => {
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

        if (memorableID) {
          session.switcherChoicesViaLinkText = {
            ...session.switcherChoicesViaLinkText ?? {},
            [memorableID]: memorableValueViaLinkText,
          };

          session.switcherChoicesViaSpanText = {
            ...session.switcherChoicesViaSpanText ?? {},
            [memorableID]: memorableValueViaSpanText,
          };
        }
      });
    });
  });
}
