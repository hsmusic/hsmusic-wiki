import {inspect} from 'node:util';

import {input} from '#composite';
import Thing from '#thing';
import {isContributionList, isDate, isFileExtension, validateReferenceList}
  from '#validators';
import {parseContributors, parseDate} from '#yaml';

import {withPropertyFromObject} from '#composite/data';
import {contentString, directory, simpleString, soupyFind, thing}
  from '#composite/wiki-properties';

import {
  exitWithoutDependency,
  exposeConstant,
  exposeDependency,
  exposeDependencyOrContinue,
  exposeUpdateValueOrContinue,
} from '#composite/control-flow';

import {
  withRecontextualizedContributionList,
  withResolvedContribs,
  withResolvedReferenceList,
} from '#composite/wiki-data';

import {withDate} from '#composite/things/artwork';

export class Artwork extends Thing {
  static [Thing.referenceType] = 'artwork';

  static [Thing.getPropertyDescriptors] = ({
    ArtTag,
    Contribution,
  }) => ({
    // Update & expose

    unqualifiedDirectory: directory({
      name: input.value(null),
    }),

    thing: thing(),

    label: simpleString(),
    source: contentString(),

    dateFromThingProperty: simpleString(),

    date: [
      withDate({
        from: input.updateValue({validate: isDate}),
      }),

      exposeDependency({dependency: '#date'}),
    ],

    fileExtensionFromThingProperty: simpleString(),

    fileExtension: [
      {
        compute: (continuation) => continuation({
          ['#default']: 'jpg',
        }),
      },

      exposeUpdateValueOrContinue({
        validate: input.value(isFileExtension),
      }),

      exitWithoutDependency({
        dependency: 'thing',
        value: '#default',
      }),

      exitWithoutDependency({
        dependency: 'fileExtensionFromThingProperty',
        value: '#default',
      }),

      withPropertyFromObject({
        object: 'thing',
        property: 'fileExtensionFromThingProperty',
      }),

      exposeDependencyOrContinue({
        dependency: '#value',
      }),

      exposeDependency({
        dependency: '#default',
      }),
    ],

    artistContribsFromThingProperty: simpleString(),
    artistContribsArtistProperty: simpleString(),

    artistContribs: [
      withDate(),

      withResolvedContribs({
        from: input.updateValue({validate: isContributionList}),
        date: '#date',
        artistProperty: 'artistContribsArtistProperty',
      }),

      exposeDependencyOrContinue({
        dependency: '#resolvedContribs',
        mode: input.value('empty'),
      }),

      {
        dependencies: ['thing', 'artistContribsFromThingProperty'],
        compute: (continuation, {thing, artistContribsFromThingProperty}) =>
          (artistContribsFromThingProperty
            ? continuation({
                '#artistContribs':
                  thing[artistContribsFromThingProperty],
              })
            : continuation.exit(null)),
      },

      withRecontextualizedContributionList({
        list: '#artistContribs',
      }),

      exposeDependency({
        dependency: '#artistContribs',
      }),
    ],

    artTags: [
      withResolvedReferenceList({
        list: input.updateValue({
          validate:
            validateReferenceList(ArtTag[Thing.referenceType]),
        }),

        find: soupyFind.input('artTag'),
      }),

      exposeDependencyOrContinue({
        dependency: '#resolvedReferenceList',
        mode: input.value('empty'),
      }),

      withPropertyFromObject({
        object: 'thing',
        property: input.value('artTags'),
      }),

      exposeDependencyOrContinue({
        dependency: '#thing.artTags',
      }),

      exposeConstant({
        value: input.value([]),
      }),
    ],

    // Update only

    find: soupyFind(),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Directory': {property: 'unqualifiedDirectory'},
      'File Extension': {property: 'fileExtension'},

      'Label': {property: 'label'},
      'Source': {property: 'source'},

      'Date': {
        property: 'date',
        transform: parseDate,
      },

      'Artists': {
        property: 'artistContribs',
        transform: parseContributors,
      },

      'Tags': {property: 'artTags'},
    },
  };

  get path() {
    if (!this.thing) return null;
    if (!this.thing.getOwnArtworkPath) return null;

    return this.thing.getOwnArtworkPath(this);
  }

  [inspect.custom](depth, options, inspect) {
    const parts = [];

    parts.push(Thing.prototype[inspect.custom].apply(this));

    if (this.thing) {
      if (depth >= 0) {
        const newOptions = {
          ...options,
          depth:
            (options.depth === null
              ? null
              : options.depth - 1),
        };

        parts.push(` for ${inspect(this.thing, newOptions)}`);
      } else {
        parts.push(` for ${colors.blue(Thing.getReference(this.thing))}`);
      }
    }

    return parts.join('');
  }
}
