import Thing from './thing.js';

import find from '../../util/find.js';

// Running your own wiki? Don't change this here!
// Set a wiki-specific color in your data directory's wiki-info.yaml file.
const defaultWikiColor = '#0088ff';

export class WikiInfo extends Thing {
  static [Thing.getPropertyDescriptors] = ({
    Group,

    validators: {
      isColor,
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

    color: ({
      flags: {update: true, expose: true},
      update: {validate: isColor, default: defaultWikiColor},
    }),

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

    divideTrackListsByGroups: Thing.common.dynamicThingsFromReferenceList(
      'divideTrackListsByGroupsByRef',
      'groupData',
      find.group
    ),
  });
}
