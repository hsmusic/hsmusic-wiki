export const WIKI_INFO_FILE = 'wiki-info.yaml';

import {input} from '#composite';
import find from '#find';
import Thing from '#thing';
import {isColor, isLanguageCode, isName, isURL} from '#validators';

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
    },

    divideTrackListsByGroups: referenceList({
      class: input.value(Group),
      find: input.value(find.group),
      data: 'groupData',
    }),

    // Feature toggles
    enableFlashesAndGames: flag(false),
    enableListings: flag(false),
    enableNews: flag(false),
    enableArtTagUI: flag(false),
    enableGroupUI: flag(false),

    // Update only

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
