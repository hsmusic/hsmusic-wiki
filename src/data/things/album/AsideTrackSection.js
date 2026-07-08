// Annoying subclass just for direct access in YAML-loading.

import Thing from '#thing';

import {TrackSection} from './TrackSection.js';

export class AsideTrackSection extends TrackSection {
  static [Thing.getPropertyDescriptors] = () => ({
    style: {
      flags: {expose: true},
      expose: {compute: () => 'aside'},
    },
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Aside Section': {property: 'name'},
    },
  };
}
