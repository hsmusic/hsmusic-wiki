import {input, V} from '#composite';
import find from '#find';
import Thing from '#thing';
import {combineWikiDataArrays} from '#wiki-data';

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
  parseDimensions,
  parseWallpaperParts,
} from '#yaml';

import {exitWithoutDependency, exitWithoutUpdateValue, exposeConstant}
  from '#composite/control-flow';

import {
  annotatedReferenceList,
  canonicalBase,
  color,
  contentString,
  dimensions,
  fileExtension,
  flag,
  name,
  referenceList,
  simpleString,
  soupyFind,
  wallpaperParts,
  wikiData,
} from '#composite/wiki-properties';

export class WikiInfo extends Thing {
  static [Thing.friendlyName] = `Wiki Info`;
  static [Thing.wikiData] = 'wikiInfo';
  static [Thing.oneInstancePerWiki] = true;

  static [Thing.getPropertyDescriptors] = ({
    Album,
    FlashSide,
    Group,
    GroupCategory,
  }) => ({
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

    hasWikiBanner: flag(V(false)),
    wikiBannerFileExtension: fileExtension(V('jpg')),
    wikiBannerDimensions: dimensions(),
    wikiBannerStyle: simpleString(),

    wikiWallpaperBrightness: {
      flags: {update: true, expose: true},
      update: {validate: isNumber},
    },

    wikiWallpaperFileExtension: fileExtension(V('jpg')),
    wikiWallpaperStyle: simpleString(),
    wikiWallpaperParts: wallpaperParts(),

    hasMetaWallpaper: flag(V(false)),

    metaWallpaperBrightness: {
      flags: {update: true, expose: true},
      update: {validate: isNumber},
    },

    metaWallpaperFileExtension: fileExtension(V('jpg')),
    metaWallpaperStyle: simpleString(),
    metaWallpaperParts: wallpaperParts(),

    divideTrackListsByGroups: referenceList({
      class: input.value(Group),
      find: soupyFind.input('group'),
    }),

    divideMusicBy: [
      // fall back to divideTrackListsByGroups
      exitWithoutUpdateValue('divideTrackListsByGroups'),

      {
        dependencies: [
          '_albumData',
          '_groupData',
          '_groupCategoryData',
        ],

        compute: (continuation, {
          ['_albumData']: albumData,
          ['_groupData']: groupData,
          ['_groupCategoryData']: groupCategoryData,
        }) => continuation({
          ['#find']:
            find.mixed({
              'album': find.album,
              'group': find.group,
              'group-category': find.groupCategory,
            }),

          ['#data']:
            combineWikiDataArrays([
              albumData,
              groupData,
              groupCategoryData,
            ]),
        }),
      },

      referenceList({
        referenceType: input.value(['album', 'group', 'group-category']),
        data: '#data',
        find: '#find',
      }),
    ],

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

    preferAdditionalNamesBox: flag(V(false)),

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

    albumData: wikiData(V(Album)),
    groupData: wikiData(V(Group)),
    groupCategoryData: wikiData(V(GroupCategory)),

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

      'Has Wiki Banner': {property: 'hasWikiBanner'},
      'Wiki Banner File Extension': {property: 'wikiBannerFileExtension'},
      'Wiki Banner Dimensions': {property: 'wikiBannerDimensions', transform: parseDimensions},
      'Wiki Banner Style': {property: 'wikiBannerStyle'},

      'Wiki Wallpaper Brightness': {property: 'wikiWallpaperBrightness'},
      'Wiki Wallpaper File Extension': {property: 'wikiWallpaperFileExtension'},
      'Wiki Wallpaper Style': {property: 'wikiWallpaperStyle'},
      'Wiki Wallpaper Parts': {property: 'wikiWallpaperParts', transform: parseWallpaperParts},

      'Has Meta Wallpaper': {property: 'hasMetaWallpaper'},
      'Meta Wallpaper Brightness': {property: 'metaWallpaperBrightness'},
      'Meta Wallpaper File Extension': {property: 'metaWallpaperFileExtension'},
      'Meta Wallpaper Style': {property: 'metaWallpaperStyle'},
      'Meta Wallpaper Parts': {property: 'metaWallpaperParts', transform: parseWallpaperParts},

      'Prefer Additional Names Box': {property: 'preferAdditionalNamesBox'},

      'Enable Flashes & Games': {property: 'enableFlashesAndGames'},
      'Enable Listings': {property: 'enableListings'},
      'Enable News': {property: 'enableNews'},
      'Enable Art Tag UI': {property: 'enableArtTagUI'},
      'Enable Group UI': {property: 'enableGroupUI'},

      'Divide Track Lists By Groups': {property: 'divideTrackListsByGroups'},
      'Divide Music By': {property: 'divideMusicBy'},

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

    invalidFieldCombinations: [
      {
        message: `Prefer Divide Music By field`,
        fields: [
          'Divide Track Lists By Groups',
          'Divide Music By',
        ],
      },
    ],
  };
}
