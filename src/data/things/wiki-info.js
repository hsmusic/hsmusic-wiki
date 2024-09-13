export const WIKI_INFO_FILE = 'wiki-info.yaml';

import {input} from '#composite';
import find from '#find';
import Thing from '#thing';
import {parseContributionPresets} from '#yaml';

import {
  isBoolean,
  isColor,
  isContributionPresetList,
  isLanguageCode,
  isName,
  isURL,
} from '#validators';

import {exitWithoutDependency} from '#composite/control-flow';
import {contentString, flag, name, referenceList, wikiData}
  from '#composite/wiki-properties';

export class WikiInfo extends Thing {
  static [Thing.friendlyName] = `Wiki Info`;

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

    color: {
      flags: {update: true, expose: true},
      update: {validate: isColor},

      expose: {
        transform: color => color ?? '#0088ff',
      },
    },

    // One-line description used for <meta rel="description"> tag.
    description: contentString(),

    footerContent: contentString(),

    defaultLanguage: {
      flags: {update: true, expose: true},
      update: {validate: isLanguageCode},
    },

    canonicalBase: {
      flags: {update: true, expose: true},
      update: {validate: isURL},
      expose: {
        transform: (value) =>
          (value === null
            ? null
         : value.endsWith('/')
            ? value
            : value + '/'),
      },
    },

    divideTrackListsByGroups: referenceList({
      class: input.value(Group),
      find: input.value(find.group),
      data: 'groupData',
    }),

    contributionPresets: {
      flags: {update: true, expose: true},
      update: {validate: isContributionPresetList},
    },

    // Feature toggles
    enableFlashesAndGames: flag(false),
    enableListings: flag(false),
    enableNews: flag(false),
    enableArtTagUI: flag(false),
    enableGroupUI: flag(false),

    enableSearch: [
      exitWithoutDependency({
        dependency: 'searchDataAvailable',
        mode: input.value('falsy'),
        value: input.value(false),
      }),

      flag(true),
    ],

    // Update only

    searchDataAvailable: {
      flags: {update: true},
      update: {
        validate: isBoolean,
        default: false,
      },
    },

    groupData: wikiData({
      class: input.value(Group),
    }),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Name': {property: 'name'},
      'Short Name': {property: 'nameShort'},
      'Color': {property: 'color'},
      'Description': {property: 'description'},
      'Footer Content': {property: 'footerContent'},
      'Default Language': {property: 'defaultLanguage'},
      'Canonical Base': {property: 'canonicalBase'},
      'Divide Track Lists By Groups': {property: 'divideTrackListsByGroups'},
      'Enable Flashes & Games': {property: 'enableFlashesAndGames'},
      'Enable Listings': {property: 'enableListings'},
      'Enable News': {property: 'enableNews'},
      'Enable Art Tag UI': {property: 'enableArtTagUI'},
      'Enable Group UI': {property: 'enableGroupUI'},

      'Contribution Presets': {
        property: 'contributionPresets',
        transform: parseContributionPresets,
      },
    },
  };

  static [Thing.getYamlLoadingSpec] = ({
    documentModes: {oneDocumentTotal},
    thingConstructors: {WikiInfo},
  }) => ({
    title: `Process wiki info file`,
    file: WIKI_INFO_FILE,

    documentMode: oneDocumentTotal,
    documentThing: WikiInfo,

    save(wikiInfo) {
      if (!wikiInfo) {
        return;
      }

      return {wikiInfo};
    },
  });
}
