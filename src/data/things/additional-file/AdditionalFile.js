import {inspect} from 'node:util';

import {colors} from '#cli';
import {input, V} from '#composite';
import Thing from '#thing';
import {isString, validateArrayItems} from '#validators';
import {parseContributors} from '#yaml';

import {exposeConstant, exposeUpdateValueOrContinue}
  from '#composite/control-flow';
import {contributionList, contentString, simpleString, soupyFind, thing}
  from '#composite/wiki-properties';

export class AdditionalFile extends Thing {
  static [Thing.friendlyName] = `Additional File`;

  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    thing: thing(),

    title: simpleString(),

    description: contentString(),

    folder: simpleString(),

    filenames: [
      exposeUpdateValueOrContinue({
        validate: input.value(validateArrayItems(isString)),
      }),

      exposeConstant(V([])),
    ],

    artistContribs: contributionList({
      // Subclasses override with the relevant artistProperty.
      artistProperty: input.value(null),
    }),

    // Update only

    find: soupyFind(),

    // Expose only

    isAdditionalFile: exposeConstant(V(true)),

    // The date property is generally expected by contributions.
    // Additional files don't actually support dates, but provide a null
    // value for convenience.
    date: {
      flags: {expose: true},
      expose: {compute: () => null},
    },
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Title': {property: 'title'},
      'Description': {property: 'description'},

      'Artists': {
        property: 'artistContribs',
        transform: parseContributors,
      },

      'Folder': {property: 'folder'},
      'Files': {property: 'filenames'},
    },
  };

  get paths() {
    if (!this.thing) return null;
    if (!this.thing.getOwnAdditionalFilePath) return null;

    return (
      this.filenames.map(filename =>
        this.thing.getOwnAdditionalFilePath(this, filename)));
  }

  [inspect.custom](depth, options, inspect) {
    const parts = [];

    parts.push(this.constructor.name);

    if (this.title) {
      parts.push(` ${colors.green(`"${this.title}"`)}`);
    }

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
        parts.push(` for ${colors.blue(Thing.inspectReference(this.thing))}`);
      }
    }

    return parts.join('');
  }
}
