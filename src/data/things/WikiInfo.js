import {input, V} from '#composite';
import Thing from '#thing';

import {
  isBoolean,
  isContributionPresetList,
  isLanguageCode,
  isName,
  isNumber,
} from '#validators';

import {
  parseAnnotatedReferences,
  parseContributionPresets,
  parseWallpaperParts,
} from '#yaml';

import {exitWithoutDependency, exposeConstant} from '#composite/control-flow';

import {
  annotatedReferenceList,
  canonicalBase,
  color,
  contentString,
  fileExtension,
  flag,
  name,
  referenceList,
  simpleString,
  soupyFind,
  wallpaperParts,
} from '#composite/wiki-properties';

export class WikiInfo extends Thing {
  static [Thing.friendlyName] = `Wiki Info`;
  static [Thing.wikiData] = 'wikiInfo';
  static [Thing.oneInstancePerWiki] = true;

  static [Thing.getPropertyDescriptors] = ({FlashSide, Group}) => ({
    // Update & expose

    name: name(V('Unnamed Wiki')),

    // Displayed in nav bar.
    nameShort: {
      flags: {update: true, expose: true},
      update: {validate: isName},

      expose: {
        dependencies: ['name'],
        transform: (value, {name}) => value ?? name,
      },
    },

    color: color(V('#0088ff')),

    // One-line description used for <meta rel="description"> tag.
    description: contentString(),

    footerContent: contentString(),

    defaultLanguage: {
      flags: {update: true, expose: true},
      update: {validate: isLanguageCode},
    },

    canonicalBase: canonicalBase(),
    canonicalMediaBase: canonicalBase(),

    wikiWallpaperBrightness: {
      flags: {update: true, expose: true},
      update: {validate: isNumber},
    },

    wikiWallpaperFileExtension: fileExtension(V('jpg')),
    wikiWallpaperStyle: simpleString(),
    wikiWallpaperParts: wallpaperParts(),

    divideTrackListsByGroups: referenceList({
      class: input.value(Group),
      find: soupyFind.input('group'),
    }),

    divideFlashListsBySides: annotatedReferenceList({
      class: input.value(FlashSide),
      find: soupyFind.input('flashSide'),

      reference: input.value('side'),
      annotation: input.value('label'),
      thing: input.value('side'),
    }),

    contributionPresets: {
      flags: {update: true, expose: true},
      update: {validate: isContributionPresetList},
    },

    // Feature toggles
    enableFlashesAndGames: flag(V(false)),
    enableListings: flag(V(false)),
    enableNews: flag(V(false)),
    enableArtTagUI: flag(V(false)),
    enableGroupUI: flag(V(false)),

    enableSearch: [
      exitWithoutDependency('_searchDataAvailable', {
        value: input.value(false),
        mode: input.value('falsy'),
      }),

      flag(V(true)),
    ],

    // Update only

    find: soupyFind(),

    searchDataAvailable: {
      flags: {update: true},
      update: {
        validate: isBoolean,
        default: false,
      },
    },

    // Expose only

    isWikiInfo: exposeConstant(V(true)),
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
      'Canonical Media Base': {property: 'canonicalMediaBase'},

      'Wiki Wallpaper Brightness': {property: 'wikiWallpaperBrightness'},
      'Wiki Wallpaper File Extension': {property: 'wikiWallpaperFileExtension'},

      'Wiki Wallpaper Style': {property: 'wikiWallpaperStyle'},

      'Wiki Wallpaper Parts': {
        property: 'wikiWallpaperParts',
        transform: parseWallpaperParts,
      },

      'Enable Flashes & Games': {property: 'enableFlashesAndGames'},
      'Enable Listings': {property: 'enableListings'},
      'Enable News': {property: 'enableNews'},
      'Enable Art Tag UI': {property: 'enableArtTagUI'},
      'Enable Group UI': {property: 'enableGroupUI'},

      'Divide Track Lists By Groups': {property: 'divideTrackListsByGroups'},

      'Divide Flash Lists By Sides': {
        property: 'divideFlashListsBySides',
        transform: value =>
          parseAnnotatedReferences(value, {
            referenceField: 'Side',
            referenceProperty: 'side',
            annotationField: 'Label',
            annotationProperty: 'label',
          }),
      },

      'Contribution Presets': {
        property: 'contributionPresets',
        transform: parseContributionPresets,
      },
    },
  };


}
