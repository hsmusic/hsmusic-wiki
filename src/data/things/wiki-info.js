import find from '#find';
import {isLanguageCode, isName, isURL} from '#validators';

import Thing, {
  color,
  flag,
  name,
  referenceList,
  simpleString,
  wikiData,
} from './thing.js';

export class WikiInfo extends Thing {
  static [Thing.getPropertyDescriptors] = ({Group}) => ({
    // Update & expose

    name: name('Unnamed Wiki'),

    // Displayed in nav bar.
    nameShort: {
      flags: {update: true, expose: true},
      update: {validate: isName},

      expose: {
        dependencies: ['name'],
        transform: (value, {name}) => value ?? name,
      },
    },

    color: color(),

    // One-line description used for <meta rel="description"> tag.
    description: simpleString(),

    footerContent: simpleString(),

    defaultLanguage: {
      flags: {update: true, expose: true},
      update: {validate: isLanguageCode},
    },

    canonicalBase: {
      flags: {update: true, expose: true},
      update: {validate: isURL},
    },

    divideTrackListsByGroups: referenceList({
      class: Group,
      find: find.group,
      data: 'groupData',
    }),

    // Feature toggles
    enableFlashesAndGames: flag(false),
    enableListings: flag(false),
    enableNews: flag(false),
    enableArtTagUI: flag(false),
    enableGroupUI: flag(false),

    // Update only

    groupData: wikiData(Group),
  });
}
