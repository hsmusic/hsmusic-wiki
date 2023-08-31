import find from '#find';

import Thing from './thing.js';

export class WikiInfo extends Thing {
  static [Thing.getPropertyDescriptors] = ({
    Group,

    validators: {
      isLanguageCode,
      isName,
      isURL,
    },
  }) => ({
    // Update & expose

    name: Thing.common.name('Unnamed Wiki'),

    // Displayed in nav bar.
    nameShort: {
      flags: {update: true, expose: true},
      update: {validate: isName},

      expose: {
        dependencies: ['name'],
        transform: (value, {name}) => value ?? name,
      },
    },

    color: Thing.common.color(),

    // One-line description used for <meta rel="description"> tag.
    description: Thing.common.simpleString(),

    footerContent: Thing.common.simpleString(),

    defaultLanguage: {
      flags: {update: true, expose: true},
      update: {validate: isLanguageCode},
    },

    canonicalBase: {
      flags: {update: true, expose: true},
      update: {validate: isURL},
    },

    divideTrackListsByGroupsByRef: Thing.common.referenceList(Group),

    // Feature toggles
    enableFlashesAndGames: Thing.common.flag(false),
    enableListings: Thing.common.flag(false),
    enableNews: Thing.common.flag(false),
    enableArtTagUI: Thing.common.flag(false),
    enableGroupUI: Thing.common.flag(false),

    // Update only

    groupData: Thing.common.wikiData(Group),

    // Expose only

    divideTrackListsByGroups: Thing.common.dynamicThingsFromReferenceList('divideTrackListsByGroupsByRef', 'groupData', find.group),
  });
}
