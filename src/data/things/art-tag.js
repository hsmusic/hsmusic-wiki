export const DATA_ART_TAGS_DIRECTORY = 'art-tags';
export const ART_TAG_DATA_FILE = 'tags.yaml';

import {readFile} from 'node:fs/promises';
import * as path from 'node:path';

import {input} from '#composite';
import {traverse} from '#node-utils';
import {sortAlphabetically} from '#sort';
import Thing from '#thing';
import {unique} from '#sugar';
import {isName} from '#validators';
import {parseAdditionalNames, parseAnnotatedReferences} from '#yaml';

import {
  exitWithoutDependency,
  exposeConstant,
  exposeDependency,
  exposeUpdateValueOrContinue,
} from '#composite/control-flow';

import {
  annotatedReferenceList,
  color,
  contentString,
  directory,
  flag,
  referenceList,
  reverseReferenceList,
  name,
  soupyFind,
  soupyReverse,
  thingList,
  urls,
} from '#composite/wiki-properties';

import {withAllDescendantArtTags, withAncestorArtTagBaobabTree}
  from '#composite/things/art-tag';

export class ArtTag extends Thing {
  static [Thing.referenceType] = 'tag';
  static [Thing.friendlyName] = `Art Tag`;

  static [Thing.getPropertyDescriptors] = ({AdditionalName}) => ({
    // Update & expose

    name: name('Unnamed Art Tag'),
    directory: directory(),
    color: color(),
    isContentWarning: flag(false),
    extraReadingURLs: urls(),

    nameShort: [
      exposeUpdateValueOrContinue({
        validate: input.value(isName),
      }),

      {
        dependencies: ['name'],
        compute: ({name}) =>
          name.replace(/ \([^)]*?\)$/, ''),
      },
    ],

    additionalNames: thingList({
      class: input.value(AdditionalName),
    }),

    description: contentString(),

    directDescendantArtTags: referenceList({
      class: input.value(ArtTag),
      find: soupyFind.input('artTag'),
    }),

    relatedArtTags: annotatedReferenceList({
      class: input.value(ArtTag),
      find: soupyFind.input('artTag'),

      reference: input.value('artTag'),
      thing: input.value('artTag'),
    }),

    // Update only

    find: soupyFind(),
    reverse: soupyReverse(),

    // Expose only

    isArtTag: [
      exposeConstant({
        value: input.value(true),
      }),
    ],

    descriptionShort: [
      exitWithoutDependency({
        dependency: 'description',
        mode: input.value('falsy'),
      }),

      {
        dependencies: ['description'],
        compute: ({description}) =>
          description.split('<hr class="split">')[0],
      },
    ],

    directlyFeaturedInArtworks: reverseReferenceList({
      reverse: soupyReverse.input('artworksWhichFeature'),
    }),

    indirectlyFeaturedInArtworks: [
      withAllDescendantArtTags(),

      {
        dependencies: ['#allDescendantArtTags'],
        compute: ({'#allDescendantArtTags': allDescendantArtTags}) =>
          unique(
            allDescendantArtTags
              .flatMap(artTag => artTag.directlyFeaturedInArtworks)),
      },
    ],

    allDescendantArtTags: [
      withAllDescendantArtTags(),
      exposeDependency({dependency: '#allDescendantArtTags'}),
    ],

    directAncestorArtTags: reverseReferenceList({
      reverse: soupyReverse.input('artTagsWhichDirectlyAncestor'),
    }),

    ancestorArtTagBaobabTree: [
      withAncestorArtTagBaobabTree(),
      exposeDependency({dependency: '#ancestorArtTagBaobabTree'}),
    ],
  });

  static [Thing.findSpecs] = {
    artTag: {
      referenceTypes: ['tag'],
      bindTo: 'artTagData',

      getMatchableNames: artTag =>
        (artTag.isContentWarning
          ? [`cw: ${artTag.name}`]
          : [artTag.name]),
    },
  };

  static [Thing.reverseSpecs] = {
    artTagsWhichDirectlyAncestor: {
      bindTo: 'artTagData',

      referencing: artTag => [artTag],
      referenced: artTag => artTag.directDescendantArtTags,
    },
  };

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Tag': {property: 'name'},
      'Short Name': {property: 'nameShort'},
      'Directory': {property: 'directory'},
      'Description': {property: 'description'},
      'Extra Reading URLs': {property: 'extraReadingURLs'},

      'Additional Names': {
        property: 'additionalNames',
        transform: parseAdditionalNames,
      },

      'Color': {property: 'color'},
      'Is CW': {property: 'isContentWarning'},

      'Direct Descendant Tags': {property: 'directDescendantArtTags'},

      'Related Tags': {
        property: 'relatedArtTags',
        transform: entries =>
          parseAnnotatedReferences(entries, {
            referenceField: 'Tag',
            referenceProperty: 'artTag',
          }),
      },
    },
  };

  static [Thing.getYamlLoadingSpec] = ({
    documentModes: {allTogether},
    thingConstructors: {ArtTag},
  }) => ({
    title: `Process art tag list files`,

    files: dataPath =>
      Promise.allSettled([
        readFile(path.join(dataPath, ART_TAG_DATA_FILE))
          .then(() => [ART_TAG_DATA_FILE]),

        traverse(path.join(dataPath, DATA_ART_TAGS_DIRECTORY), {
          filterFile: name => path.extname(name) === '.yaml',
          prefixPath: DATA_ART_TAGS_DIRECTORY,
        }),
      ]).then(results => results
          .filter(({status}) => status === 'fulfilled')
          .flatMap(({value}) => value)),

    documentMode: allTogether,
    documentThing: ArtTag,

    save: (results) => ({artTagData: results}),

    sort({artTagData}) {
      sortAlphabetically(artTagData);
    },
  });
}
