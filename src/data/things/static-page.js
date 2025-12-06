export const DATA_STATIC_PAGE_DIRECTORY = 'static-page';

import * as path from 'node:path';

import {V} from '#composite';
import {traverse} from '#node-utils';
import {sortAlphabetically} from '#sort';
import Thing from '#thing';
import {isName} from '#validators';

import {exposeConstant} from '#composite/control-flow';
import {contentString, directory, flag, name, simpleString}
  from '#composite/wiki-properties';

export class StaticPage extends Thing {
  static [Thing.referenceType] = 'static';
  static [Thing.friendlyName] = `Static Page`;
  static [Thing.wikiData] = 'staticPageData';

  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    name: name(V('Unnamed Static Page')),

    nameShort: {
      flags: {update: true, expose: true},
      update: {validate: isName},

      expose: {
        dependencies: ['name'],
        transform: (value, {name}) => value ?? name,
      },
    },

    directory: directory(),

    stylesheet: simpleString(),
    script: simpleString(),
    content: contentString(),

    absoluteLinks: flag(V(false)),

    // Expose only

    isStaticPage: exposeConstant(V(true)),
  });

  static [Thing.findSpecs] = {
    staticPage: {
      referenceTypes: ['static'],
      bindTo: 'staticPageData',
    },
  };

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Name': {property: 'name'},
      'Short Name': {property: 'nameShort'},
      'Directory': {property: 'directory'},

      'Absolute Links': {property: 'absoluteLinks'},

      'Style': {property: 'stylesheet'},
      'Script': {property: 'script'},
      'Content': {property: 'content'},

      'Review Points': {ignore: true},
    },
  };

  static [Thing.getYamlLoadingSpec] = ({
    documentModes: {onePerFile},
    thingConstructors: {StaticPage},
  }) => ({
    title: `Process static page files`,

    files: dataPath =>
      traverse(path.join(dataPath, DATA_STATIC_PAGE_DIRECTORY), {
        filterFile: name => path.extname(name) === '.yaml',
        prefixPath: DATA_STATIC_PAGE_DIRECTORY,
      }),

    documentMode: onePerFile,
    documentThing: StaticPage,

    sort({staticPageData}) {
      sortAlphabetically(staticPageData);
    },
  });
}
