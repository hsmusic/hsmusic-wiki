/* eslint-env browser */

import {empty} from '../../shared-util/sugar.js';

import {info as hashLinkInfo} from './hash-link.js';
import {info as stickyHeadingInfo} from './sticky-heading.js';

export const info = {
  id: 'albumCommentarySidebarInfo',

  sidebar: null,
  sidebarHeading: null,

  sidebarTrackLinks: null,
  sidebarTrackDirectories: null,

  sidebarTrackSections: null,
  sidebarTrackSectionStartIndices: null,

  state: {
    currentTrackSection: null,
    currentTrackLink: null,
    justChangedTrackSection: false,
  },
};

export function getPageReferences() {
  if (document.documentElement.dataset.urlKey !== 'localized.albumCommentary') {
    return;
  }

  info.sidebar =
    document.getElementById('sidebar-left');

  info.sidebarHeading =
    info.sidebar.querySelector('h1');

  info.sidebarTrackLinks =
    Array.from(info.sidebar.querySelectorAll('li a'));

  info.sidebarTrackDirectories =
    info.sidebarTrackLinks
      .map(el => el.getAttribute('href')?.slice(1) ?? null);

  info.sidebarTrackSections =
    Array.from(info.sidebar.getElementsByTagName('details'));

  info.sidebarTrackSectionStartIndices =
    info.sidebarTrackSections
      .map(details => details.querySelector('ol, ul'))
      .reduce(
        (accumulator, _list, index, array) =>
          (empty(accumulator)
            ? [0]
            : [
              ...accumulator,
              (accumulator[accumulator.length - 1] +
                array[index - 1].querySelectorAll('li a').length),
            ]),
        []);
}

function scrollAlbumCommentarySidebar() {
  const {state} = info;
  const {currentTrackLink, currentTrackSection} = state;

  if (!currentTrackLink) {
    return;
  }

  const {sidebar, sidebarHeading} = info;

  const scrollTop = sidebar.scrollTop;

  const headingRect = sidebarHeading.getBoundingClientRect();
  const sidebarRect = sidebar.getBoundingClientRect();

  const stickyPadding = headingRect.height;
  const sidebarViewportHeight = sidebarRect.height - stickyPadding;

  const linkRect = currentTrackLink.getBoundingClientRect();
  const sectionRect = currentTrackSection.getBoundingClientRect();

  const sectionTopEdge =
    sectionRect.top - (sidebarRect.top - scrollTop);

  const sectionHeight =
    sectionRect.height;

  const sectionScrollTop =
    sectionTopEdge - stickyPadding - 10;

  const linkTopEdge =
    linkRect.top - (sidebarRect.top - scrollTop);

  const linkBottomEdge =
    linkRect.bottom - (sidebarRect.top - scrollTop);

  const linkScrollTop =
    linkTopEdge - stickyPadding - 5;

  const linkVisibleFromTopOfSection =
    linkBottomEdge - sectionTopEdge > sidebarViewportHeight;

  const linkScrollBottom =
    linkScrollTop - sidebarViewportHeight + linkRect.height + 20;

  const maxScrollInViewport =
    scrollTop + stickyPadding + sidebarViewportHeight;

  const minScrollInViewport =
    scrollTop + stickyPadding;

  if (linkBottomEdge > maxScrollInViewport) {
    if (linkVisibleFromTopOfSection) {
      sidebar.scrollTo({top: linkScrollBottom, behavior: 'smooth'});
    } else {
      sidebar.scrollTo({top: sectionScrollTop, behavior: 'smooth'});
    }
  } else if (linkTopEdge < minScrollInViewport) {
    if (linkVisibleFromTopOfSection) {
      sidebar.scrollTo({top: linkScrollTop, behavior: 'smooth'});
    } else {
      sidebar.scrollTo({top: sectionScrollTop, behavior: 'smooth'});
    }
  } else if (state.justChangedTrackSection) {
    if (sectionHeight < sidebarViewportHeight) {
      sidebar.scrollTo({top: sectionScrollTop, behavior: 'smooth'});
    }
  }
}

function markDirectoryAsCurrentForAlbumCommentary(trackDirectory) {
  const {state} = info;

  const trackIndex =
    (trackDirectory
      ? info.sidebarTrackDirectories
          .indexOf(trackDirectory)
      : -1);

  const sectionIndex =
    (trackIndex >= 0
      ? info.sidebarTrackSectionStartIndices
          .findIndex((start, index, array) =>
            (index === array.length - 1
              ? true
              : trackIndex < array[index + 1]))
      : -1);

  const sidebarTrackLink =
    (trackIndex >= 0
      ? info.sidebarTrackLinks[trackIndex]
      : null);

  const sidebarTrackSection =
    (sectionIndex >= 0
      ? info.sidebarTrackSections[sectionIndex]
      : null);

  state.currentTrackLink?.classList?.remove('current');
  state.currentTrackLink = sidebarTrackLink;
  state.currentTrackLink?.classList?.add('current');

  if (sidebarTrackSection !== state.currentTrackSection) {
    if (sidebarTrackSection && !sidebarTrackSection.open) {
      if (state.currentTrackSection) {
        state.currentTrackSection.open = false;
      }

      sidebarTrackSection.open = true;
    }

    state.currentTrackSection?.classList?.remove('current');
    state.currentTrackSection = sidebarTrackSection;
    state.currentTrackSection?.classList?.add('current');
    state.justChangedTrackSection = true;
  } else {
    state.justChangedTrackSection = false;
  }
}

export function addInternalListeners() {
  if (!info.sidebar) {
    return;
  }

  const mainContentIndex =
    (stickyHeadingInfo.contentContainers ?? [])
      .findIndex(({id}) => id === 'content');

  if (mainContentIndex === -1) return;

  stickyHeadingInfo.event.whenDisplayedHeadingChanges.push((index, {newHeading}) => {
    if (index !== mainContentIndex) return;
    if (hashLinkInfo.state.scrollingAfterClick) return;

    const trackDirectory =
      (newHeading
        ? newHeading.id
        : null);

    markDirectoryAsCurrentForAlbumCommentary(trackDirectory);
    scrollAlbumCommentarySidebar();
  });

  hashLinkInfo.event.whenHashLinkClicked.push(({link}) => {
    const hash = link.getAttribute('href').slice(1);
    if (!info.sidebarTrackDirectories.includes(hash)) return;
    markDirectoryAsCurrentForAlbumCommentary(hash);
  });
}
