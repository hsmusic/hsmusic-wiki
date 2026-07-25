import {stitchArrays} from '../../shared-util/sugar.js';

import {cssProp} from '../client-util.js';

export const info = {
  id: 'showMoreLessSwitcherInfo',

  switcherMemorableIDs: null,

  switcherShowMoreLinks: null,
  switcherShowLessLinks: null,

  switcherShowMoreTargets: null,
  switcherShowLessTargets: null,

  session: {
    expandedSwitchers: {
      type: 'json',
      maxLength: settings => settings.maxExpandedSwitcherStorage,
    },
  },

  settings: {
    maxExpandedSwitcherStorage: 1000,
  },
};

export function getPageReferences() {
  const switchers =
    Array.from(document.querySelectorAll('.show-more-less-switcher'));

  info.switcherMemorableIDs =
    switchers
      .map(switcher => switcher.getAttribute('data-memorable-id'));

  info.switcherShowMoreLinks =
    switchers
      .map(switcher => switcher.querySelector('.show-more'));

  info.switcherShowLessLinks =
    switchers
      .map(switcher => switcher.querySelector('.show-less'));

  const getTarget = (link, direction) => {
    const targetID = link.getAttribute('data-target-id');
    const target = document.getElementById(targetID);
    if (target) {
      return target;
    } else {
      console.warn(
        `A "${direction}" link is targetting an ID that doesn't exist, #${targetID}`,
        link);
      link.setAttribute('inert', '');
      return null;
    }
  };

  info.switcherShowMoreTargets =
    info.switcherShowMoreLinks
      .map(link => getTarget(link, `show more`));

  info.switcherShowLessTargets =
    info.switcherShowLessLinks
      .map(link => getTarget(link, `show less`));
}

export function mutatePageContent() {
  const {session} = info;

  stitchArrays({
    memorableID: info.switcherMemorableIDs,
    showMoreLink: info.switcherShowMoreLinks,
    showLessLink: info.switcherShowLessLinks,
    showMoreTarget: info.switcherShowMoreTargets,
    showLessTarget: info.switcherShowLessTargets,
  }).forEach(({
    memorableID,
    showMoreLink,
    showLessLink,
    showMoreTarget,
    showLessTarget,
  }) => {
    if (!memorableID) return;
    if (!session.expandedSwitchers?.includes(memorableID)) return;

    cssProp(showMoreLink, 'display', 'none');
    cssProp(showMoreTarget, 'display', null);

    cssProp(showLessLink, 'display', null);
    cssProp(showLessTarget, 'display', 'none');
  });
}

export function addPageListeners() {
  const {session} = info;

  stitchArrays({
    memorableID: info.switcherMemorableIDs,
    showMoreLink: info.switcherShowMoreLinks,
    showLessLink: info.switcherShowLessLinks,
    showMoreTarget: info.switcherShowMoreTargets,
    showLessTarget: info.switcherShowLessTargets,
  }).forEach(({
    memorableID,
    showMoreLink,
    showLessLink,
    showMoreTarget,
    showLessTarget,
  }) => {
    showMoreLink.addEventListener('click', domEvent => {
      domEvent.preventDefault();

      cssProp(showMoreLink, 'display', 'none');
      cssProp(showMoreTarget, 'display', null);

      cssProp(showLessLink, 'display', null);
      cssProp(showLessTarget, 'display', 'none');

      if (memorableID) {
        if (session.expandedSwitchers) {
          session.expandedSwitchers = [...session.expandedSwitchers, memorableID];
        } else {
          session.expandedSwitchers = [memorableID];
        }
      }
    });

    showLessLink.addEventListener('click', domEvent => {
      domEvent.preventDefault();

      cssProp(showLessLink, 'display', 'none');
      cssProp(showLessTarget, 'display', null);

      cssProp(showMoreLink, 'display', null);
      cssProp(showMoreTarget, 'display', 'none');

      if (memorableID && session.expandedSwitchers) {
        session.expandedSwitchers = session.expandedSwitchers
          .filter(item => item !== memorableID);
      }
    });
  });
}
