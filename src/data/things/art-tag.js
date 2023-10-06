export const ART_TAG_DATA_FILE = 'tags.yaml';

import {input} from '#composite';
import find from '#find';
import {sortAlphabetically, sortAlbumsTracksChronologically} from '#sort';
import Thing from '#thing';
import {unique} from '#sugar';
import {isName} from '#validators';

import {exitWithoutDependency, exposeDependency, exposeUpdateValueOrContinue}
  from '#composite/control-flow';

import {
  color,
  directory,
  flag,
  referenceList,
  reverseReferenceList,
  simpleString,
  name,
  soupyFind,
  soupyReverse,
  urls,
  wikiData,
} from '#composite/wiki-properties';

import {withAllDescendantArtTags, withAncestorArtTagBaobabTree}
  from '#composite/things/art-tag';

export class ArtTag extends Thing {
  static [Thing.referenceType] = 'tag';
  static [Thing.friendlyName] = `Art Tag`;

  static [Thing.getPropertyDescriptors] = ({Album, Track}) => ({
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

    description: simpleString(),

    directDescendantArtTags: referenceList({
      class: input.value(ArtTag),
      find: soupyFind.input('artTag'),
    }),

    // Update only

    find: soupyFind(),
    reverse: soupyReverse(),

    // Expose only

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

    directlyTaggedInThings: {
      flags: {expose: true},

      expose: {
        dependencies: ['this', 'reverse'],
        compute: ({this: artTag, reverse}) =>
          sortAlbumsTracksChronologically(
            [
              ...reverse.albumsWhoseArtworksFeature(artTag),
              ...reverse.tracksWhoseArtworksFeature(artTag),
            ],
            {getDate: thing => thing.coverArtDate ?? thing.date}),
      },
    },

    indirectlyTaggedInThings: [
      withAllDescendantArtTags(),

      {
        dependencies: ['#allDescendantArtTags'],
        compute: ({'#allDescendantArtTags': allDescendantArtTags}) =>
          unique(
            allDescendantArtTags
              .flatMap(artTag => artTag.directlyTaggedInThings)),
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

      'Color': {property: 'color'},
      'Is CW': {property: 'isContentWarning'},

      'Direct Descendant Tags': {property: 'directDescendantArtTags'},
    },
  };

  static [Thing.getYamlLoadingSpec] = ({
    documentModes: {allInOne},
    thingConstructors: {ArtTag},
  }) => ({
    title: `Process art tags file`,
    file: ART_TAG_DATA_FILE,

    documentMode: allInOne,
    documentThing: ArtTag,

    save: (results) => ({artTagData: results}),

    sort({artTagData}) {
      sortAlphabetically(artTagData);
    },
  });
}
