// Flash page and index specifications.

import {empty} from '../util/sugar.js';
import {getFlashLink} from '../util/wiki-data.js';

export const description = `flash & game pages`;

export function condition({wikiData}) {
  return wikiData.wikiInfo.enableFlashesAndGames;
}

export function targets({wikiData}) {
  return wikiData.flashData;
}

export function pathsForTarget(flash) {
  return [
    {
      type: 'page',
      path: ['flash', flash.directory],

      contentFunction: {
        name: 'generateFlashInfoPage',
        args: [flash],
      },
    },
  ];
}

export function pathsTargetless() {
  return [
    {
      type: 'page',
      path: ['flashIndex'],
      contentFunction: {name: 'generateFlashIndexPage'},
    },
  ];
}
