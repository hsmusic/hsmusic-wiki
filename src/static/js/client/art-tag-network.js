/* eslint-env browser */

import {cssProp} from '../client-util.js';

import {atOffset, stitchArrays} from '../../shared-util/sugar.js';

export const info = {
  id: 'artTagNetworkInfo',

  noneStatLink: null,
  totalUsesStatLink: null,
  directUsesStatLink: null,
  descendantsStatLink: null,

  tagsWithoutStats: null,
  tagsWithStats: null,

  totalUsesStats: null,
  directUsesStats: null,
  descendantsStats: null,
};

export function getPageReferences() {
  if (
    document.documentElement.dataset.urlKey !== 'localized.listing' ||
    document.documentElement.dataset.urlValue0 !== 'tags/network'
  ) {
    return;
  }

  info.noneStatLink =
    document.getElementById('network-stat-none');

  info.totalUsesStatLink =
    document.getElementById('network-stat-total-uses');

  info.directUsesStatLink =
    document.getElementById('network-stat-direct-uses');

  info.descendantsStatLink =
    document.getElementById('network-stat-descendants');

  info.tagsWithoutStats =
    document.querySelectorAll('.network-tag:not(.with-stat)');

  info.tagsWithStats =
    document.querySelectorAll('.network-tag.with-stat');

  info.totalUsesStats =
    Array.from(document.getElementsByClassName('network-tag-total-uses-stat'));

  info.directUsesStats =
    Array.from(document.getElementsByClassName('network-tag-direct-uses-stat'));

  info.descendantsStats =
    Array.from(document.getElementsByClassName('network-tag-descendants-stat'));
}

export function addPageListeners() {
  if (!info.noneStatLink) return;

  const linkOrder = [
    info.noneStatLink,
    info.totalUsesStatLink,
    info.directUsesStatLink,
    info.descendantsStatLink,
  ];

  const statsOrder = [
    null,
    info.totalUsesStats,
    info.directUsesStats,
    info.descendantsStats,
  ];

  const stitched =
    stitchArrays({
      link: linkOrder,
      stats: statsOrder,
    });

  for (const [index, {link}] of stitched.entries()) {
    const next = atOffset(stitched, index, +1, {wrap: true});

    link.addEventListener('click', domEvent => {
      domEvent.preventDefault();

      cssProp(link, 'display', 'none');
      cssProp(next.link, 'display', null);

      if (next.stats === null) {
        hideArtTagNetworkStats();
      } else {
        showArtTagNetworkStats(next.stats);
      }
    });
  }
}

function showArtTagNetworkStats(stats) {
  for (const tagElement of info.tagsWithoutStats) {
    cssProp(tagElement, 'display', 'none');
  }

  for (const tagElement of info.tagsWithStats) {
    cssProp(tagElement, 'display', null);
  }

  const allStats = [
    ...info.totalUsesStats,
    ...info.directUsesStats,
    ...info.descendantsStats,
  ];

  const otherStats =
    allStats
      .filter(stat => !stats.includes(stat));

  for (const statElement of otherStats) {
    cssProp(statElement, 'display', 'none');
  }

  for (const statElement of stats) {
    cssProp(statElement, 'display', null);
  }
}

function hideArtTagNetworkStats() {
  for (const tagElement of info.tagsWithoutStats) {
    cssProp(tagElement, 'display', null);
  }

  for (const tagElement of info.tagsWithStats) {
    cssProp(tagElement, 'display', 'none');
  }
}
