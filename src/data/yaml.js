// yaml.js - specification for HSMusic YAML data file format and utilities for
// loading, processing, and validating YAML files and documents

import {readFile, stat} from 'node:fs/promises';
import * as path from 'node:path';
import {inspect as nodeInspect} from 'node:util';

import yaml from 'js-yaml';

import {colors, ENABLE_COLOR, logInfo, logWarn} from '#cli';
import find, {bindFind} from '#find';
import {traverse} from '#node-utils';

import T, {
  CacheableObject,
  CacheableObjectPropertyValueError,
  Thing,
} from '#things';

import {
  annotateErrorWithFile,
  conditionallySuppressError,
  decorateErrorWithIndex,
  decorateErrorWithAnnotation,
  empty,
  filterProperties,
  openAggregate,
  showAggregate,
  withAggregate,
} from '#sugar';

import {
  sortAlbumsTracksChronologically,
  sortAlphabetically,
  sortChronologically,
  sortFlashesChronologically,
} from '#wiki-data';

// --> General supporting stuff

function inspect(value) {
  return nodeInspect(value, {colors: ENABLE_COLOR});
}

// --> YAML data repository structure constants

export const WIKI_INFO_FILE = 'wiki-info.yaml';
export const BUILD_DIRECTIVE_DATA_FILE = 'build-directives.yaml';
export const HOMEPAGE_LAYOUT_DATA_FILE = 'homepage.yaml';
export const ARTIST_DATA_FILE = 'artists.yaml';
export const FLASH_DATA_FILE = 'flashes.yaml';
export const NEWS_DATA_FILE = 'news.yaml';
export const ART_TAG_DATA_FILE = 'tags.yaml';
export const GROUP_DATA_FILE = 'groups.yaml';

export const DATA_ALBUM_DIRECTORY = 'album';
export const DATA_STATIC_PAGE_DIRECTORY = 'static-page';

// --> Document processing functions

// General function for inputting a single document (usually loaded from YAML)
// and outputting an instance of a provided Thing subclass.
//
// makeProcessDocument is a factory function: the returned function will take a
// document and apply the configuration passed to makeProcessDocument in order
// to construct a Thing subclass.
function makeProcessDocument(
  thingConstructor,
  {
    // Optional early step for transforming field values before providing them
    // to the Thing's update() method. This is useful when the input format
    // (i.e. values in the document) differ from the format the actual Thing
    // expects.
    //
    // Each key and value are a field name (not an update() property) and a
    // function which takes the value for that field and returns the value which
    // will be passed on to update().
    //
    fieldTransformations = {},

    // Mapping of Thing.update() source properties to field names.
    //
    // Note this is property -> field, not field -> property. This is a
    // shorthand convenience because properties are generally typical
    // camel-cased JS properties, while fields may contain whitespace and be
    // more easily represented as quoted strings.
    //
    propertyFieldMapping,

    // Completely ignored fields. These won't throw an unknown field error if
    // they're present in a document, but they won't be used for Thing property
    // generation, either. Useful for stuff that's present in data files but not
    // yet implemented as part of a Thing's data model!
    //
    ignoredFields = [],

    // List of fields which are invalid when coexisting in a document.
    // Data objects are generally allowing with regards to what properties go
    // together, allowing for properties to be set separately from each other
    // instead of complaining about invalid or unused-data cases. But it's
    // useful to see these kinds of errors when actually validating YAML files!
    //
    // Each item of this array should itself be an object with a descriptive
    // message and a list of fields. Of those fields, none should ever coexist
    // with any other. For example:
    //
    //   [
    //     {message: '...', fields: ['A', 'B', 'C']},
    //     {message: '...', fields: ['C', 'D']},
    //   ]
    //
    // ...means A can't coexist with B or C, B can't coexist with A or C, and
    // C can't coexist iwth A, B, or D - but it's okay for D to coexist with
    // A or B.
    //
    invalidFieldCombinations = [],
  }
) {
  if (!thingConstructor) {
    throw new Error(`Missing Thing class`);
  }

  if (!propertyFieldMapping) {
    throw new Error(`Expected propertyFieldMapping to be provided`);
  }

  const knownFields = Object.values(propertyFieldMapping);

  // Invert the property-field mapping, since it'll come in handy for
  // assigning update() source values later.
  const fieldPropertyMapping = Object.fromEntries(
    Object.entries(propertyFieldMapping)
      .map(([property, field]) => [field, property]));

  const decorateErrorWithName = (fn) => {
    const nameField = propertyFieldMapping['name'];
    if (!nameField) return fn;

    return (document) => {
      try {
        return fn(document);
      } catch (error) {
        const name = document[nameField];
        error.message = name
          ? `(name: ${inspect(name)}) ${error.message}`
          : `(${colors.dim(`no name found`)}) ${error.message}`;
        throw error;
      }
    };
  };

  const fn = decorateErrorWithName((document) => {
    const nameField = propertyFieldMapping['name'];
    const namePart =
      (nameField
        ? (document[nameField]
          ? ` named ${colors.green(`"${document[nameField]}"`)}`
          : ` (name field, "${nameField}", not specified)`)
        : ``);

    const constructorPart =
      (thingConstructor[Thing.friendlyName]
        ? colors.green(thingConstructor[Thing.friendlyName])
     : thingConstructor.name
        ? colors.green(thingConstructor.name)
        : `document`);

    const aggregate = openAggregate({
      message: `Errors processing ${constructorPart}` + namePart,
    });

    const documentEntries = Object.entries(document)
      .filter(([field]) => !ignoredFields.includes(field));

    const skippedFields = new Set();

    const unknownFields = documentEntries
      .map(([field]) => field)
      .filter((field) => !knownFields.includes(field));

    if (!empty(unknownFields)) {
      aggregate.push(new UnknownFieldsError(unknownFields));

      for (const field of unknownFields) {
        skippedFields.add(field);
      }
    }

    const presentFields = Object.keys(document);

    const fieldCombinationErrors = [];

    for (const {message, fields} of invalidFieldCombinations) {
      const fieldsPresent = presentFields.filter(field => fields.includes(field));

      if (fieldsPresent.length >= 2) {
        const filteredDocument =
          filterProperties(
            document,
            fieldsPresent,
            {preserveOriginalOrder: true});

        fieldCombinationErrors.push(new FieldCombinationError(filteredDocument, message));

        for (const field of Object.keys(filteredDocument)) {
          skippedFields.add(field);
        }
      }
    }

    if (!empty(fieldCombinationErrors)) {
      aggregate.push(new FieldCombinationAggregateError(fieldCombinationErrors));
    }

    const fieldValues = {};

    for (const [field, documentValue] of documentEntries) {
      if (skippedFields.has(field)) continue;

      // This variable would like to certify itself as "not into capitalism".
      let propertyValue =
        (Object.hasOwn(fieldTransformations, field)
          ? fieldTransformations[field](documentValue)
          : documentValue);

      // Completely blank items in a YAML list are read as null.
      // They're handy to have around when filling out a document and shouldn't
      // be considered an error (or data at all).
      if (Array.isArray(propertyValue)) {
        const wasEmpty = empty(propertyValue);

        propertyValue =
          propertyValue.filter(item => item !== null);

        const isEmpty = empty(propertyValue);

        // Don't set arrays which are empty as a result of the above filter.
        // Arrays which were originally empty, i.e. `Field: []`, are still
        // valid data, but if it's just an array not containing any filled out
        // items, it should be treated as a placeholder and skipped over.
        if (isEmpty && !wasEmpty) {
          propertyValue = null;
        }
      }

      fieldValues[field] = propertyValue;
    }

    const sourceProperties = {};

    for (const [field, value] of Object.entries(fieldValues)) {
      const property = fieldPropertyMapping[field];
      sourceProperties[property] = value;
    }

    const thing = Reflect.construct(thingConstructor, []);

    const fieldValueErrors = [];

    for (const [property, value] of Object.entries(sourceProperties)) {
      const field = propertyFieldMapping[property];
      try {
        thing[property] = value;
      } catch (caughtError) {
        skippedFields.add(field);
        fieldValueErrors.push(new FieldValueError(field, property, value, caughtError));
      }
    }

    if (!empty(fieldValueErrors)) {
      aggregate.push(new FieldValueAggregateError(thingConstructor, fieldValueErrors));
    }

    if (skippedFields.size >= 1) {
      aggregate.push(
        new SkippedFieldsSummaryError(
          filterProperties(
            document,
            Array.from(skippedFields),
            {preserveOriginalOrder: true})));
    }

    return {thing, aggregate};
  });

  Object.assign(fn, {
    propertyFieldMapping,
    fieldPropertyMapping,
  });

  return fn;
}

export class UnknownFieldsError extends Error {
  constructor(fields) {
    super(`Unknown fields ignored: ${fields.map(field => colors.red(field)).join(', ')}`);
    this.fields = fields;
  }
}

export class FieldCombinationAggregateError extends AggregateError {
  constructor(errors) {
    super(errors, `Invalid field combinations - all involved fields ignored`);
  }
}

export class FieldCombinationError extends Error {
  constructor(fields, message) {
    const fieldNames = Object.keys(fields);

    const mainMessage = `Don't combine ${fieldNames.map(field => colors.red(field)).join(', ')}`;

    const causeMessage =
      (typeof message === 'function'
        ? message(fields)
     : typeof message === 'string'
        ? message
        : null);

    super(mainMessage, {
      cause:
        (causeMessage
          ? new Error(causeMessage)
          : null),
    });

    this.fields = fields;
  }
}

export class FieldValueAggregateError extends AggregateError {
  constructor(thingConstructor, errors) {
    super(errors, `Errors processing field values for ${colors.green(thingConstructor.name)}`);
  }
}

export class FieldValueError extends Error {
  constructor(field, property, value, caughtError) {
    const cause =
      (caughtError instanceof CacheableObjectPropertyValueError
        ? caughtError.cause
        : caughtError);

    super(
      `Failed to set ${colors.green(`"${field}"`)} field (${colors.green(property)}) to ${inspect(value)}`,
      {cause});
  }
}

export class SkippedFieldsSummaryError extends Error {
  constructor(filteredDocument) {
    const entries = Object.entries(filteredDocument);

    const lines =
      entries.map(([field, value]) =>
        ` - ${field}: ` +
        inspect(value)
          .split('\n')
          .map((line, index) => index === 0 ? line : `   ${line}`)
          .join('\n'));

    super(
      colors.bright(colors.yellow(`Altogether, skipped ${entries.length === 1 ? `1 field` : `${entries.length} fields`}:\n`)) +
      lines.join('\n') + '\n' +
      colors.bright(colors.yellow(`See above errors for details.`)));
  }
}

export const processAlbumDocument = makeProcessDocument(T.Album, {
  fieldTransformations: {
    'Artists': parseContributors,
    'Cover Artists': parseContributors,
    'Default Track Cover Artists': parseContributors,
    'Wallpaper Artists': parseContributors,
    'Banner Artists': parseContributors,

    'Date': (value) => new Date(value),
    'Date Added': (value) => new Date(value),
    'Cover Art Date': (value) => new Date(value),
    'Default Track Cover Art Date': (value) => new Date(value),

    'Banner Dimensions': parseDimensions,

    'Additional Files': parseAdditionalFiles,
  },

  propertyFieldMapping: {
    name: 'Album',
    directory: 'Directory',
    date: 'Date',
    color: 'Color',
    urls: 'URLs',

    hasTrackNumbers: 'Has Track Numbers',
    isListedOnHomepage: 'Listed on Homepage',
    isListedInGalleries: 'Listed in Galleries',

    coverArtDate: 'Cover Art Date',
    trackArtDate: 'Default Track Cover Art Date',
    dateAddedToWiki: 'Date Added',

    coverArtFileExtension: 'Cover Art File Extension',
    trackCoverArtFileExtension: 'Track Art File Extension',

    wallpaperArtistContribs: 'Wallpaper Artists',
    wallpaperStyle: 'Wallpaper Style',
    wallpaperFileExtension: 'Wallpaper File Extension',

    bannerArtistContribs: 'Banner Artists',
    bannerStyle: 'Banner Style',
    bannerFileExtension: 'Banner File Extension',
    bannerDimensions: 'Banner Dimensions',

    commentary: 'Commentary',
    additionalFiles: 'Additional Files',

    artistContribs: 'Artists',
    coverArtistContribs: 'Cover Artists',
    trackCoverArtistContribs: 'Default Track Cover Artists',
    groups: 'Groups',
    artTags: 'Art Tags',
  },
});

export const processTrackSectionDocument = makeProcessDocument(T.TrackSectionHelper, {
  fieldTransformations: {
    'Date Originally Released': (value) => new Date(value),
  },

  propertyFieldMapping: {
    name: 'Section',
    color: 'Color',
    dateOriginallyReleased: 'Date Originally Released',
  },
});

export const processTrackDocument = makeProcessDocument(T.Track, {
  fieldTransformations: {
    'Additional Names': parseAdditionalNames,
    'Duration': parseDuration,

    'Date First Released': (value) => new Date(value),
    'Cover Art Date': (value) => new Date(value),
    'Has Cover Art': (value) =>
      (value === true ? false :
       value === false ? true :
       value),

    'Artists': parseContributors,
    'Contributors': parseContributors,
    'Cover Artists': parseContributors,

    'Additional Files': parseAdditionalFiles,
    'Sheet Music Files': parseAdditionalFiles,
    'MIDI Project Files': parseAdditionalFiles,
  },

  propertyFieldMapping: {
    name: 'Track',
    directory: 'Directory',
    additionalNames: 'Additional Names',
    duration: 'Duration',
    color: 'Color',
    urls: 'URLs',

    dateFirstReleased: 'Date First Released',
    coverArtDate: 'Cover Art Date',
    coverArtFileExtension: 'Cover Art File Extension',
    disableUniqueCoverArt: 'Has Cover Art', // This gets transformed to flip true/false.

    alwaysReferenceByDirectory: 'Always Reference By Directory',

    lyrics: 'Lyrics',
    commentary: 'Commentary',
    additionalFiles: 'Additional Files',
    sheetMusicFiles: 'Sheet Music Files',
    midiProjectFiles: 'MIDI Project Files',

    originalReleaseTrack: 'Originally Released As',
    referencedTracks: 'Referenced Tracks',
    sampledTracks: 'Sampled Tracks',
    artistContribs: 'Artists',
    contributorContribs: 'Contributors',
    coverArtistContribs: 'Cover Artists',
    artTags: 'Art Tags',
  },

  invalidFieldCombinations: [
    {message: `Re-releases inherit references from the original`, fields: [
      'Originally Released As',
      'Referenced Tracks',
    ]},

    {message: `Re-releases inherit samples from the original`, fields: [
      'Originally Released As',
      'Sampled Tracks',
    ]},

    {message: `Re-releases inherit artists from the original`, fields: [
      'Originally Released As',
      'Artists',
    ]},

    {message: `Re-releases inherit contributors from the original`, fields: [
      'Originally Released As',
      'Contributors',
    ]},

    {
      message: ({'Has Cover Art': hasCoverArt}) =>
        (hasCoverArt
          ? `"Has Cover Art: true" is inferred from cover artist credits`
          : `Tracks without cover art must not have cover artist credits`),

      fields: [
        'Has Cover Art',
        'Cover Artists',
      ],
    },
  ],
});

export const processArtistDocument = makeProcessDocument(T.Artist, {
  propertyFieldMapping: {
    name: 'Artist',
    directory: 'Directory',
    urls: 'URLs',
    contextNotes: 'Context Notes',

    hasAvatar: 'Has Avatar',
    avatarFileExtension: 'Avatar File Extension',

    aliasNames: 'Aliases',
  },

  ignoredFields: ['Dead URLs'],
});

export const processFlashDocument = makeProcessDocument(T.Flash, {
  fieldTransformations: {
    'Date': (value) => new Date(value),

    'Contributors': parseContributors,
  },

  propertyFieldMapping: {
    name: 'Flash',
    directory: 'Directory',
    page: 'Page',
    color: 'Color',
    urls: 'URLs',

    date: 'Date',
    coverArtFileExtension: 'Cover Art File Extension',

    featuredTracks: 'Featured Tracks',
    contributorContribs: 'Contributors',
  },
});

export const processFlashActDocument = makeProcessDocument(T.FlashAct, {
  propertyFieldMapping: {
    name: 'Act',
    directory: 'Directory',

    color: 'Color',
    listTerminology: 'List Terminology',

    jump: 'Jump',
    jumpColor: 'Jump Color',
  },
});

export const processNewsEntryDocument = makeProcessDocument(T.NewsEntry, {
  fieldTransformations: {
    'Date': (value) => new Date(value),
  },

  propertyFieldMapping: {
    name: 'Name',
    directory: 'Directory',
    date: 'Date',
    content: 'Content',
  },
});

export const processArtTagDocument = makeProcessDocument(T.ArtTag, {
  propertyFieldMapping: {
    name: 'Tag',
    nameShort: 'Short Name',
    directory: 'Directory',

    color: 'Color',
    isContentWarning: 'Is CW',
  },
});

export const processGroupDocument = makeProcessDocument(T.Group, {
  propertyFieldMapping: {
    name: 'Group',
    directory: 'Directory',
    description: 'Description',
    urls: 'URLs',

    featuredAlbums: 'Featured Albums',
  },
});

export const processGroupCategoryDocument = makeProcessDocument(T.GroupCategory, {
  propertyFieldMapping: {
    name: 'Category',
    color: 'Color',
  },
});

export const processStaticPageDocument = makeProcessDocument(T.StaticPage, {
  propertyFieldMapping: {
    name: 'Name',
    nameShort: 'Short Name',
    directory: 'Directory',

    stylesheet: 'Style',
    content: 'Content',
  },
});

export const processWikiInfoDocument = makeProcessDocument(T.WikiInfo, {
  propertyFieldMapping: {
    name: 'Name',
    nameShort: 'Short Name',
    color: 'Color',
    description: 'Description',
    footerContent: 'Footer Content',
    defaultLanguage: 'Default Language',
    canonicalBase: 'Canonical Base',
    divideTrackListsByGroups: 'Divide Track Lists By Groups',
    enableFlashesAndGames: 'Enable Flashes & Games',
    enableListings: 'Enable Listings',
    enableNews: 'Enable News',
    enableArtTagUI: 'Enable Art Tag UI',
    enableGroupUI: 'Enable Group UI',
  },
});

export const processHomepageLayoutDocument = makeProcessDocument(T.HomepageLayout, {
  propertyFieldMapping: {
    sidebarContent: 'Sidebar Content',
    navbarLinks: 'Navbar Links',
  },

  ignoredFields: ['Homepage'],
});

export function makeProcessHomepageLayoutRowDocument(rowClass, spec) {
  return makeProcessDocument(rowClass, {
    ...spec,

    propertyFieldMapping: {
      name: 'Row',
      color: 'Color',
      type: 'Type',
      ...spec.propertyFieldMapping,
    },
  });
}

export const homepageLayoutRowTypeProcessMapping = {
  albums: makeProcessHomepageLayoutRowDocument(T.HomepageLayoutAlbumsRow, {
    propertyFieldMapping: {
      displayStyle: 'Display Style',
      sourceGroup: 'Group',
      countAlbumsFromGroup: 'Count',
      sourceAlbums: 'Albums',
      actionLinks: 'Actions',
    },
  }),
};

export function processHomepageLayoutRowDocument(document) {
  const type = document['Type'];

  const match = Object.entries(homepageLayoutRowTypeProcessMapping)
    .find(([key]) => key === type);

  if (!match) {
    throw new TypeError(`No processDocument function for row type ${type}!`);
  }

  return match[1](document);
}

// --> Utilities shared across document parsing functions

export function parseDuration(string) {
  if (typeof string !== 'string') {
    return string;
  }

  const parts = string.split(':').map((n) => parseInt(n));
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else {
    return 0;
  }
}

export function parseAdditionalFiles(array) {
  if (!Array.isArray(array)) {
    // Error will be caught when validating against whatever this value is
    return array;
  }

  return array.map((item) => ({
    title: item['Title'],
    description: item['Description'] ?? null,
    files: item['Files'],
  }));
}

const extractAccentRegex =
  /^(?<main>.*?)(?: \((?<accent>.*)\))?$/;

export function parseContributors(contributionStrings) {
  // If this isn't something we can parse, just return it as-is.
  // The Thing object's validators will handle the data error better
  // than we're able to here.
  if (!Array.isArray(contributionStrings)) {
    return contributionStrings;
  }

  return contributionStrings.map(contribString => {
    if (typeof contribString !== 'string') return contribString;

    const match = contribString.match(extractAccentRegex);
    if (!match) return contribString;

    return {
      who: match.groups.main,
      what: match.groups.accent ?? null,
    };
  });
}

export function parseAdditionalNames(additionalNameStrings) {
  if (!Array.isArray(additionalNameStrings)) {
    return additionalNameStrings;
  }

  return additionalNameStrings.map(additionalNameString => {
    if (typeof additionalNameString !== 'string') return additionalNameString;

    const match = additionalNameString.match(extractAccentRegex);
    if (!match) return additionalNameString;

    return {
      name: match.groups.main,
      annotation: match.groups.accent ?? null,
    };
  });
}

function parseDimensions(string) {
  // It's technically possible to pass an array like [30, 40] through here.
  // That's not really an issue because if it isn't of the appropriate shape,
  // the Thing object's validators will handle the error.
  if (typeof string !== 'string') {
    return string;
  }

  const parts = string.split(/[x,* ]+/g);

  if (parts.length !== 2) {
    throw new Error(`Invalid dimensions: ${string} (expected "width & height")`);
  }

  const nums = parts.map((part) => Number(part.trim()));

  if (nums.includes(NaN)) {
    throw new Error(`Invalid dimensions: ${string} (couldn't parse as numbers)`);
  }

  return nums;
}

// --> Data repository loading functions and descriptors

// documentModes: Symbols indicating sets of behavior for loading and processing
// data files.
export const documentModes = {
  // onePerFile: One document per file. Expects files array (or function) and
  // processDocument function. Obviously, each specified data file should only
  // contain one YAML document (an error will be thrown otherwise). Calls save
  // with an array of processed documents (wiki objects).
  onePerFile: Symbol('Document mode: onePerFile'),

  // headerAndEntries: One or more documents per file; the first document is
  // treated as a "header" and represents data which pertains to all following
  // "entry" documents. Expects files array (or function) and
  // processHeaderDocument and processEntryDocument functions. Calls save with
  // an array of {header, entries} objects.
  //
  // Please note that the final results loaded from each file may be "missing"
  // data objects corresponding to entry documents if the processEntryDocument
  // function throws on any entries, resulting in partial data provided to
  // save() - errors will be caught and thrown in the final buildSteps
  // aggregate. However, if the processHeaderDocument function fails, all
  // following documents in the same file will be ignored as well (i.e. an
  // entire file will be excempt from the save() function's input).
  headerAndEntries: Symbol('Document mode: headerAndEntries'),

  // allInOne: One or more documents, all contained in one file. Expects file
  // string (or function) and processDocument function. Calls save with an
  // array of processed documents (wiki objects).
  allInOne: Symbol('Document mode: allInOne'),

  // oneDocumentTotal: Just a single document, represented in one file.
  // Expects file string (or function) and processDocument function. Calls
  // save with the single processed wiki document (data object).
  //
  // Please note that if the single document fails to process, the save()
  // function won't be called at all, generally resulting in an altogether
  // missing property from the global wikiData object. This should be caught
  // and handled externally.
  oneDocumentTotal: Symbol('Document mode: oneDocumentTotal'),
};

// dataSteps: Top-level array of "steps" for loading YAML document files.
//
// title:
//   Name of the step (displayed in build output)
//
// documentMode:
//   Symbol which indicates by which "mode" documents from data files are
//   loaded and processed. See documentModes export.
//
// file, files:
//   String or array of strings which are paths to YAML data files, or a
//   function which returns the above (may be async). All paths are appended to
//   the global dataPath provided externally (e.g. HSMUSIC_DATA env variable).
//   Which to provide (file or files) depends on documentMode. If this is a
//   function, it will be provided with dataPath (e.g. so that a sub-path may be
//   readdir'd), but don't path.join(dataPath) the returned value(s) yourself -
//   this will be done automatically.
//
// processDocument, processHeaderDocument, processEntryDocument:
//   Functions which take a YAML document and return an actual wiki data object;
//   all actual conversion between YAML and wiki data happens here. Which to
//   provide (one or a combination) depend on documentMode.
//
// save:
//   Function which takes all documents processed (now as wiki data objects) and
//   actually applies them to a global wiki data object, for use in page
//   generation and other behavior. Returns an object to be assigned over the
//   global wiki data object (so specify any new properties here). This is also
//   the place to perform any final post-processing on data objects (linking
//   them to each other, setting additional properties, etc). Input argument
//   format depends on documentMode.
//
export const dataSteps = [
  {
    title: `Process wiki info file`,
    file: WIKI_INFO_FILE,

    documentMode: documentModes.oneDocumentTotal,
    processDocument: processWikiInfoDocument,

    save(wikiInfo) {
      if (!wikiInfo) {
        return;
      }

      return {wikiInfo};
    },
  },

  {
    title: `Process album files`,

    files: dataPath =>
      traverse(path.join(dataPath, DATA_ALBUM_DIRECTORY), {
        filterFile: name => path.extname(name) === '.yaml',
        prefixPath: DATA_ALBUM_DIRECTORY,
      }),

    documentMode: documentModes.headerAndEntries,
    processHeaderDocument: processAlbumDocument,
    processEntryDocument(document) {
      return 'Section' in document
        ? processTrackSectionDocument(document)
        : processTrackDocument(document);
    },

    save(results) {
      const albumData = [];
      const trackData = [];

      for (const {header: album, entries} of results) {
        // We can't mutate an array once it's set as a property value,
        // so prepare the track sections that will show up in a track list
        // all the way before actually applying them. (It's okay to mutate
        // an individual section before applying it, since those are just
        // generic objects; they aren't Things in and of themselves.)
        const trackSections = [];

        let currentTrackSection = {
          name: `Default Track Section`,
          isDefaultTrackSection: true,
          tracks: [],
        };

        const albumRef = Thing.getReference(album);

        const closeCurrentTrackSection = () => {
          if (!empty(currentTrackSection.tracks)) {
            trackSections.push(currentTrackSection);
          }
        };

        for (const entry of entries) {
          if (entry instanceof T.TrackSectionHelper) {
            closeCurrentTrackSection();

            currentTrackSection = {
              name: entry.name,
              color: entry.color,
              dateOriginallyReleased: entry.dateOriginallyReleased,
              isDefaultTrackSection: false,
              tracks: [],
            };

            continue;
          }

          trackData.push(entry);

          entry.dataSourceAlbum = albumRef;

          currentTrackSection.tracks.push(Thing.getReference(entry));
        }

        closeCurrentTrackSection();

        album.trackSections = trackSections;
        albumData.push(album);
      }

      return {albumData, trackData};
    },
  },

  {
    title: `Process artists file`,
    file: ARTIST_DATA_FILE,

    documentMode: documentModes.allInOne,
    processDocument: processArtistDocument,

    save(results) {
      const artistData = results;

      const artistAliasData = results.flatMap((artist) => {
        const origRef = Thing.getReference(artist);
        return artist.aliasNames?.map((name) => {
          const alias = new T.Artist();
          alias.name = name;
          alias.isAlias = true;
          alias.aliasedArtist = origRef;
          alias.artistData = artistData;
          return alias;
        }) ?? [];
      });

      return {artistData, artistAliasData};
    },
  },

  // TODO: WD.wikiInfo.enableFlashesAndGames &&
  {
    title: `Process flashes file`,
    file: FLASH_DATA_FILE,

    documentMode: documentModes.allInOne,
    processDocument(document) {
      return 'Act' in document
        ? processFlashActDocument(document)
        : processFlashDocument(document);
    },

    save(results) {
      let flashAct;
      let flashRefs = [];

      if (results[0] && !(results[0] instanceof T.FlashAct)) {
        throw new Error(`Expected an act at top of flash data file`);
      }

      for (const thing of results) {
        if (thing instanceof T.FlashAct) {
          if (flashAct) {
            Object.assign(flashAct, {flashes: flashRefs});
          }

          flashAct = thing;
          flashRefs = [];
        } else {
          flashRefs.push(Thing.getReference(thing));
        }
      }

      if (flashAct) {
        Object.assign(flashAct, {flashes: flashRefs});
      }

      const flashData = results.filter((x) => x instanceof T.Flash);
      const flashActData = results.filter((x) => x instanceof T.FlashAct);

      return {flashData, flashActData};
    },
  },

  {
    title: `Process groups file`,
    file: GROUP_DATA_FILE,

    documentMode: documentModes.allInOne,
    processDocument(document) {
      return 'Category' in document
        ? processGroupCategoryDocument(document)
        : processGroupDocument(document);
    },

    save(results) {
      let groupCategory;
      let groupRefs = [];

      if (results[0] && !(results[0] instanceof T.GroupCategory)) {
        throw new Error(`Expected a category at top of group data file`);
      }

      for (const thing of results) {
        if (thing instanceof T.GroupCategory) {
          if (groupCategory) {
            Object.assign(groupCategory, {groups: groupRefs});
          }

          groupCategory = thing;
          groupRefs = [];
        } else {
          groupRefs.push(Thing.getReference(thing));
        }
      }

      if (groupCategory) {
        Object.assign(groupCategory, {groups: groupRefs});
      }

      const groupData = results.filter((x) => x instanceof T.Group);
      const groupCategoryData = results.filter((x) => x instanceof T.GroupCategory);

      return {groupData, groupCategoryData};
    },
  },

  {
    title: `Process homepage layout file`,

    // Kludge: This benefits from the same headerAndEntries style messaging as
    // albums and tracks (for example), but that document mode is designed to
    // support multiple files, and only one is actually getting processed here.
    files: [HOMEPAGE_LAYOUT_DATA_FILE],

    documentMode: documentModes.headerAndEntries,
    processHeaderDocument: processHomepageLayoutDocument,
    processEntryDocument: processHomepageLayoutRowDocument,

    save(results) {
      if (!results[0]) {
        return;
      }

      const {header: homepageLayout, entries: rows} = results[0];
      Object.assign(homepageLayout, {rows});
      return {homepageLayout};
    },
  },

  // TODO: WD.wikiInfo.enableNews &&
  {
    title: `Process news data file`,
    file: NEWS_DATA_FILE,

    documentMode: documentModes.allInOne,
    processDocument: processNewsEntryDocument,

    save(newsData) {
      sortChronologically(newsData);
      newsData.reverse();

      return {newsData};
    },
  },

  {
    title: `Process art tags file`,
    file: ART_TAG_DATA_FILE,

    documentMode: documentModes.allInOne,
    processDocument: processArtTagDocument,

    save(artTagData) {
      sortAlphabetically(artTagData);

      return {artTagData};
    },
  },

  {
    title: `Process static page files`,

    files: dataPath =>
      traverse(path.join(dataPath, DATA_STATIC_PAGE_DIRECTORY), {
        filterFile: name => path.extname(name) === '.yaml',
        prefixPath: DATA_STATIC_PAGE_DIRECTORY,
      }),

    documentMode: documentModes.onePerFile,
    processDocument: processStaticPageDocument,

    save(staticPageData) {
      sortAlphabetically(staticPageData);

      return {staticPageData};
    },
  },
];

export async function loadAndProcessDataDocuments({dataPath}) {
  const processDataAggregate = openAggregate({
    message: `Errors processing data files`,
  });
  const wikiDataResult = {};

  function decorateErrorWithFile(fn) {
    return decorateErrorWithAnnotation(fn,
      (caughtError, firstArg) =>
        annotateErrorWithFile(
          caughtError,
          path.relative(
            dataPath,
            (typeof firstArg === 'object'
              ? firstArg.file
              : firstArg))));
  }

  function asyncDecorateErrorWithFile(fn) {
    return decorateErrorWithFile(fn).async;
  }

  for (const dataStep of dataSteps) {
    await processDataAggregate.nestAsync(
      {message: `Errors during data step: ${colors.bright(dataStep.title)}`},
      async ({call, callAsync, map, mapAsync, push}) => {
        const {documentMode} = dataStep;

        if (!Object.values(documentModes).includes(documentMode)) {
          throw new Error(`Invalid documentMode: ${documentMode.toString()}`);
        }

        // Hear me out, it's been like 1200 years since I wrote the rest of
        // this beautifully error-containing code and I don't know how to
        // integrate this nicely. So I'm just returning the result and the
        // error that should be thrown. Yes, we're back in callback hell,
        // just without the callbacks. Thank you.
        const filterBlankDocuments = documents => {
          const aggregate = openAggregate({
            message: `Found blank documents - check for extra '${colors.cyan(`---`)}'`,
          });

          const filteredDocuments =
            documents
              .filter(doc => doc !== null);

          if (filteredDocuments.length !== documents.length) {
            const blankIndexRangeInfo =
              documents
                .map((doc, index) => [doc, index])
                .filter(([doc]) => doc === null)
                .map(([doc, index]) => index)
                .reduce((accumulator, index) => {
                  if (accumulator.length === 0) {
                    return [[index, index]];
                  }
                  const current = accumulator.at(-1);
                  const rest = accumulator.slice(0, -1);
                  if (current[1] === index - 1) {
                    return rest.concat([[current[0], index]]);
                  } else {
                    return accumulator.concat([[index, index]]);
                  }
                }, [])
                .map(([start, end]) => ({
                  start,
                  end,
                  count: end - start + 1,
                  previous:
                    (start > 0
                      ? documents[start - 1]
                      : null),
                  next:
                    (end < documents.length - 1
                      ? documents[end + 1]
                      : null),
                }));

            for (const {start, end, count, previous, next} of blankIndexRangeInfo) {
              const parts = [];

              if (count === 1) {
                const range = `#${start + 1}`;
                parts.push(`${count} document (${colors.yellow(range)}), `);
              } else {
                const range = `#${start + 1}-${end + 1}`;
                parts.push(`${count} documents (${colors.yellow(range)}), `);
              }

              if (previous === null) {
                parts.push(`at start of file`);
              } else if (next === null) {
                parts.push(`at end of file`);
              } else {
                const previousDescription = Object.entries(previous).at(0).join(': ');
                const nextDescription = Object.entries(next).at(0).join(': ');
                parts.push(`between "${colors.cyan(previousDescription)}" and "${colors.cyan(nextDescription)}"`);
              }

              aggregate.push(new Error(parts.join('')));
            }
          }

          return {documents: filteredDocuments, aggregate};
        };

        if (
          documentMode === documentModes.allInOne ||
          documentMode === documentModes.oneDocumentTotal
        ) {
          if (!dataStep.file) {
            throw new Error(`Expected 'file' property for ${documentMode.toString()}`);
          }

          const file = path.join(
            dataPath,
            typeof dataStep.file === 'function'
              ? await callAsync(dataStep.file, dataPath)
              : dataStep.file);

          const statResult = await callAsync(() =>
            stat(file).then(
              () => true,
              error => {
                if (error.code === 'ENOENT') {
                  return false;
                } else {
                  throw error;
                }
              }));

          if (statResult === false) {
            const saveResult = call(dataStep.save, {
              [documentModes.allInOne]: [],
              [documentModes.oneDocumentTotal]: {},
            }[documentMode]);

            if (!saveResult) return;

            Object.assign(wikiDataResult, saveResult);

            return;
          }

          const readResult = await callAsync(readFile, file, 'utf-8');

          if (!readResult) {
            return;
          }

          let processResults;

          switch (documentMode) {
            case documentModes.oneDocumentTotal: {
              const yamlResult = call(yaml.load, readResult);

              if (!yamlResult) {
                processResults = null;
                break;
              }

              const {thing, aggregate} =
                dataStep.processDocument(yamlResult);

              processResults = thing;

              call(() => aggregate.close());

              break;
            }

            case documentModes.allInOne: {
              const yamlResults = call(yaml.loadAll, readResult);

              if (!yamlResults) {
                processResults = [];
                return;
              }

              const {documents, aggregate: filterAggregate} =
                filterBlankDocuments(yamlResults);

              call(filterAggregate.close);

              processResults = [];

              map(documents, decorateErrorWithIndex(document => {
                const {thing, aggregate} =
                  dataStep.processDocument(document);

                processResults.push(thing);
                aggregate.close();
              }), {message: `Errors processing documents`});

              break;
            }
          }

          if (!processResults) return;

          const saveResult = call(dataStep.save, processResults);

          if (!saveResult) return;

          Object.assign(wikiDataResult, saveResult);

          return;
        }

        if (!dataStep.files) {
          throw new Error(`Expected 'files' property for ${documentMode.toString()}`);
        }

        const filesFromDataStep =
          (typeof dataStep.files === 'function'
            ? await callAsync(() =>
                dataStep.files(dataPath).then(
                  files => files,
                  error => {
                    if (error.code === 'ENOENT') {
                      return [];
                    } else {
                      throw error;
                    }
                  }))
            : dataStep.files);

        const filesUnderDataPath =
          filesFromDataStep
            .map(file => path.join(dataPath, file));

        const yamlResults = [];

        await mapAsync(filesUnderDataPath, {message: `Errors loading data files`},
          asyncDecorateErrorWithFile(async file => {
            let contents;
            try {
              contents = await readFile(file, 'utf-8');
            } catch (caughtError) {
              throw new Error(`Failed to read data file`, {cause: caughtError});
            }

            let documents;
            try {
              documents = yaml.loadAll(contents);
            } catch (caughtError) {
              throw new Error(`Failed to parse valid YAML`, {cause: caughtError});
            }

            const {documents: filteredDocuments, aggregate: filterAggregate} =
              filterBlankDocuments(documents);

            try {
              filterAggregate.close();
            } catch (caughtError) {
              // Blank documents aren't a critical error, they're just something
              // that should be noted - the (filtered) documents still get pushed.
              const pathToFile = path.relative(dataPath, file);
              annotateErrorWithFile(caughtError, pathToFile);
              push(caughtError);
            }

            yamlResults.push({file, documents: filteredDocuments});
          }));

        const processResults = [];

        switch (documentMode) {
          case documentModes.headerAndEntries:
            map(yamlResults, {message: `Errors processing documents in data files`},
              decorateErrorWithFile(({documents}) => {
                const headerDocument = documents[0];
                const entryDocuments = documents.slice(1).filter(Boolean);

                if (!headerDocument)
                  throw new Error(`Missing header document (empty file or erroneously starting with "---"?)`);

                withAggregate({message: `Errors processing documents`}, ({push}) => {
                  const {thing: headerObject, aggregate: headerAggregate} =
                    dataStep.processHeaderDocument(headerDocument);

                  try {
                    headerAggregate.close();
                  } catch (caughtError) {
                    caughtError.message = `(${colors.yellow(`header`)}) ${caughtError.message}`;
                    push(caughtError);
                  }

                  const entryObjects = [];

                  for (let index = 0; index < entryDocuments.length; index++) {
                    const entryDocument = entryDocuments[index];

                    const {thing: entryObject, aggregate: entryAggregate} =
                      dataStep.processEntryDocument(entryDocument);

                    entryObjects.push(entryObject);

                    try {
                      entryAggregate.close();
                    } catch (caughtError) {
                      caughtError.message = `(${colors.yellow(`entry #${index + 1}`)}) ${caughtError.message}`;
                      push(caughtError);
                    }
                  }

                  processResults.push({
                    header: headerObject,
                    entries: entryObjects,
                  });
                });
              }));
            break;

          case documentModes.onePerFile:
            map(yamlResults, {message: `Errors processing data files as valid documents`},
              decorateErrorWithFile(({documents}) => {
                if (documents.length > 1)
                  throw new Error(`Only expected one document to be present per file, got ${documents.length} here`);

                if (empty(documents) || !documents[0])
                  throw new Error(`Expected a document, this file is empty`);

                const {thing, aggregate} =
                  dataStep.processDocument(documents[0]);

                processResults.push(thing);
                aggregate.close();
              }));
            break;
        }

        const saveResult = call(dataStep.save, processResults);

        if (!saveResult) return;

        Object.assign(wikiDataResult, saveResult);
      }
    );
  }

  return {
    aggregate: processDataAggregate,
    result: wikiDataResult,
  };
}

// Data linking! Basically, provide (portions of) wikiData to the Things which
// require it - they'll expose dynamically computed properties as a result (many
// of which are required for page HTML generation and other expected behavior).
//
// The XXX_decacheWikiData option should be used specifically to mark
// points where you *aren't* replacing any of the arrays under wikiData with
// new values, and are using linkWikiDataArrays to instead "decache" data
// properties which depend on any of them. It's currently not possible for
// a CacheableObject to depend directly on the value of a property exposed
// on some other CacheableObject, so when those values change, you have to
// manually decache before the object will realize its cache isn't valid
// anymore.
export function linkWikiDataArrays(wikiData, {
  XXX_decacheWikiData = false,
} = {}) {
  function assignWikiData(things, ...keys) {
    if (things === undefined) return;
    for (let i = 0; i < things.length; i++) {
      const thing = things[i];
      for (let j = 0; j < keys.length; j++) {
        const key = keys[j];
        if (!(key in wikiData)) continue;
        if (XXX_decacheWikiData) thing[key] = [];
        thing[key] = wikiData[key];
      }
    }
  }

  const WD = wikiData;

  assignWikiData([WD.wikiInfo], 'groupData');

  assignWikiData(WD.albumData, 'artistData', 'artTagData', 'groupData', 'trackData');
  assignWikiData(WD.trackData, 'albumData', 'artistData', 'artTagData', 'flashData', 'trackData');
  assignWikiData(WD.artistData, 'albumData', 'artistData', 'flashData', 'trackData');
  assignWikiData(WD.groupData, 'albumData', 'groupCategoryData');
  assignWikiData(WD.groupCategoryData, 'groupData');
  assignWikiData(WD.flashData, 'artistData', 'flashActData', 'trackData');
  assignWikiData(WD.flashActData, 'flashData');
  assignWikiData(WD.artTagData, 'albumData', 'trackData');
  assignWikiData(WD.homepageLayout?.rows, 'albumData', 'groupData');
}

export function sortWikiDataArrays(wikiData) {
  Object.assign(wikiData, {
    albumData: sortChronologically(wikiData.albumData.slice()),
    trackData: sortAlbumsTracksChronologically(wikiData.trackData.slice()),
    flashData: sortFlashesChronologically(wikiData.flashData.slice()),
  });

  // Re-link data arrays, so that every object has the new, sorted versions.
  // Note that the sorting step deliberately creates new arrays (mutating
  // slices instead of the original arrays) - this is so that the object
  // caching system understands that it's working with a new ordering.
  // We still need to actually provide those updated arrays over again!
  linkWikiDataArrays(wikiData);
}

// Warn about directories which are reused across more than one of the same type
// of Thing. Directories are the unique identifier for most data objects across
// the wiki, so we have to make sure they aren't duplicated!  This also
// altogether filters out instances of things with duplicate directories (so if
// two tracks share the directory "megalovania", they'll both be skipped for the
// build, for example).
export function filterDuplicateDirectories(wikiData) {
  const deduplicateSpec = [
    'albumData',
    'artTagData',
    'artistData',
    'flashData',
    'flashActData',
    'groupData',
    'newsData',
    'trackData',
  ];

  const aggregate = openAggregate({message: `Duplicate directories found`});
  for (const thingDataProp of deduplicateSpec) {
    const thingData = wikiData[thingDataProp];
    aggregate.nest({message: `Duplicate directories found in ${colors.green('wikiData.' + thingDataProp)}`}, ({call}) => {
      const directoryPlaces = Object.create(null);
      const duplicateDirectories = [];

      for (const thing of thingData) {
        const {directory} = thing;
        if (directory in directoryPlaces) {
          directoryPlaces[directory].push(thing);
          duplicateDirectories.push(directory);
        } else {
          directoryPlaces[directory] = [thing];
        }
      }

      if (empty(duplicateDirectories)) return;

      duplicateDirectories.sort((a, b) => {
        const aL = a.toLowerCase();
        const bL = b.toLowerCase();
        return aL < bL ? -1 : aL > bL ? 1 : 0;
      });

      for (const directory of duplicateDirectories) {
        const places = directoryPlaces[directory];
        call(() => {
          throw new Error(
            `Duplicate directory ${colors.green(directory)}:\n` +
              places.map((thing) => ` - ` + inspect(thing)).join('\n')
          );
        });
      }

      const allDuplicatedThings = Object.values(directoryPlaces)
        .filter((arr) => arr.length > 1)
        .flat();

      const filteredThings = thingData
        .filter((thing) => !allDuplicatedThings.includes(thing));

      wikiData[thingDataProp] = filteredThings;
    });
  }

  // TODO: This code closes the aggregate but it generally gets closed again
  // by the caller. This works but it might be weird to assume closing an
  // aggregate twice is okay, maybe there's a better solution? Expose a new
  // function on aggregates for checking if it *would* error?
  // (i.e: errors.length > 0)
  try {
    aggregate.close();
  } catch (error) {
    // Duplicate entries were found and filtered out, resulting in altered
    // wikiData arrays. These must be re-linked so objects receive the new
    // data.
    linkWikiDataArrays(wikiData);
  }
  return aggregate;
}

// Warn about references across data which don't match anything.  This involves
// using the find() functions on all references, setting it to 'error' mode, and
// collecting everything in a structured logged (which gets logged if there are
// any errors). At the same time, we remove errored references from the thing's
// data array.
export function filterReferenceErrors(wikiData) {
  const referenceSpec = [
    ['wikiInfo', processWikiInfoDocument, {
      divideTrackListsByGroups: 'group',
    }],

    ['albumData', processAlbumDocument, {
      artistContribs: '_contrib',
      coverArtistContribs: '_contrib',
      trackCoverArtistContribs: '_contrib',
      wallpaperArtistContribs: '_contrib',
      bannerArtistContribs: '_contrib',
      groups: 'group',
      artTags: 'artTag',
    }],

    ['trackData', processTrackDocument, {
      artistContribs: '_contrib',
      contributorContribs: '_contrib',
      coverArtistContribs: '_contrib',
      referencedTracks: '_trackNotRerelease',
      sampledTracks: '_trackNotRerelease',
      artTags: 'artTag',
      originalReleaseTrack: '_trackNotRerelease',
    }],

    ['groupCategoryData', processGroupCategoryDocument, {
      groups: 'group',
    }],

    ['homepageLayout.rows', undefined, {
      sourceGroup: '_homepageSourceGroup',
      sourceAlbums: 'album',
    }],

    ['flashData', processFlashDocument, {
      contributorContribs: '_contrib',
      featuredTracks: 'track',
    }],

    ['flashActData', processFlashActDocument, {
      flashes: 'flash',
    }],
  ];

  function getNestedProp(obj, key) {
    const recursive = (o, k) =>
      k.length === 1 ? o[k[0]] : recursive(o[k[0]], k.slice(1));
    const keys = key.split(/(?<=(?<!\\)(?:\\\\)*)\./);
    return recursive(obj, keys);
  }

  const aggregate = openAggregate({message: `Errors validating between-thing references in data`});
  const boundFind = bindFind(wikiData, {mode: 'error'});
  for (const [thingDataProp, providedProcessDocumentFn, propSpec] of referenceSpec) {
    const thingData = getNestedProp(wikiData, thingDataProp);

    aggregate.nest({message: `Reference errors in ${colors.green('wikiData.' + thingDataProp)}`}, ({nest}) => {
      const things = Array.isArray(thingData) ? thingData : [thingData];

      for (const thing of things) {
        let processDocumentFn = providedProcessDocumentFn;

        if (processDocumentFn === undefined) {
          switch (thingDataProp) {
            case 'homepageLayout.rows':
              processDocumentFn = homepageLayoutRowTypeProcessMapping[thing.type]
              break;
          }
        }

        nest({message: `Reference errors in ${inspect(thing)}`}, ({nest, push, filter}) => {
          for (const [property, findFnKey] of Object.entries(propSpec)) {
            const value = CacheableObject.getUpdateValue(thing, property);

            if (value === undefined) {
              push(new TypeError(`Property ${colors.red(property)} isn't valid for ${colors.green(thing.constructor.name)}`));
              continue;
            }

            if (value === null) {
              continue;
            }

            let findFn;

            switch (findFnKey) {
              case '_contrib':
                findFn = contribRef => {
                  const alias = find.artist(contribRef.who, wikiData.artistAliasData, {mode: 'quiet'});
                  if (alias) {
                    // No need to check if the original exists here. Aliases are automatically
                    // created from a field on the original, so the original certainly exists.
                    const original = alias.aliasedArtist;
                    throw new Error(`Reference ${colors.red(contribRef.who)} is to an alias, should be ${colors.green(original.name)}`);
                  }

                  return boundFind.artist(contribRef.who);
                };
                break;

              case '_homepageSourceGroup':
                findFn = groupRef => {
                  if (groupRef === 'new-additions' || groupRef === 'new-releases') {
                    return true;
                  }

                  return boundFind.group(groupRef);
                };
                break;

              case '_trackNotRerelease':
                findFn = trackRef => {
                  const track = find.track(trackRef, wikiData.trackData, {mode: 'error'});
                  const originalRef = track && CacheableObject.getUpdateValue(track, 'originalReleaseTrack');

                  if (originalRef) {
                    // It's possible for the original to not actually exist, in this case.
                    // It should still be reported since the 'Originally Released As' field
                    // was present.
                    const original = find.track(originalRef, wikiData.trackData, {mode: 'quiet'});

                    // Prefer references by name, but only if it's unambiguous.
                    const originalByName =
                      (original
                        ? find.track(original.name, wikiData.trackData, {mode: 'quiet'})
                        : null);

                    const shouldBeMessage =
                      (originalByName
                        ? colors.green(original.name)
                     : original
                        ? colors.green('track:' + original.directory)
                        : colors.green(originalRef));

                    throw new Error(`Reference ${colors.red(trackRef)} is to a rerelease, should be ${shouldBeMessage}`);
                  }

                  return track;
                };
                break;

              default:
                findFn = boundFind[findFnKey];
                break;
            }

            const suppress = fn => conditionallySuppressError(error => {
              if (property === 'sampledTracks') {
                // Suppress "didn't match anything" errors in particular, just for samples.
                // In hsmusic-data we have a lot of "stub" sample data which don't have
                // corresponding tracks yet, so it won't be useful to report such reference
                // errors until we take the time to address that. But other errors, like
                // malformed reference strings or miscapitalized existing tracks, should
                // still be reported, as samples of existing tracks *do* display on the
                // website!
                if (error.message.includes(`Didn't match anything`)) {
                  return true;
                }
              }

              return false;
            }, fn);

            const fieldPropertyMessage =
              (processDocumentFn?.propertyFieldMapping?.[property]
                ? ` in field ${colors.green(processDocumentFn.propertyFieldMapping[property])}`
                : ` in property ${colors.green(property)}`);

            const findFnMessage =
              (findFnKey.startsWith('_')
                ? ``
                : ` (${colors.green('find.' + findFnKey)})`);

            const errorMessage =
              (Array.isArray(value)
                ? `Reference errors` + fieldPropertyMessage + findFnMessage
                : `Reference error` + fieldPropertyMessage + findFnMessage);

            if (Array.isArray(value)) {
              thing[property] = filter(
                value,
                decorateErrorWithIndex(suppress(findFn)),
                {message: errorMessage});
            } else {
              nest({message: errorMessage},
                suppress(({call}) => {
                  try {
                    call(findFn, value);
                  } catch (error) {
                    thing[property] = null;
                    throw error;
                  }
                }));
            }
          }
        });
      }
    });
  }

  return aggregate;
}

// Utility function for loading all wiki data from the provided YAML data
// directory (e.g. the root of the hsmusic-data repository). This doesn't
// provide much in the way of customization; it's meant to be used more as
// a boilerplate for more specialized output, or as a quick start in utilities
// where reporting info about data loading isn't as relevant as during the
// main wiki build process.
export async function quickLoadAllFromYAML(dataPath, {
  showAggregate: customShowAggregate = showAggregate,
} = {}) {
  const showAggregate = customShowAggregate;

  let wikiData;

  {
    const {aggregate, result} = await loadAndProcessDataDocuments({dataPath});

    wikiData = result;

    try {
      aggregate.close();
      logInfo`Loaded data without errors. (complete data)`;
    } catch (error) {
      showAggregate(error);
      logWarn`Loaded data with errors. (partial data)`;
    }
  }

  linkWikiDataArrays(wikiData);

  try {
    filterDuplicateDirectories(wikiData).close();
    logInfo`No duplicate directories found. (complete data)`;
  } catch (error) {
    showAggregate(error);
    logWarn`Duplicate directories found. (partial data)`;
  }

  try {
    filterReferenceErrors(wikiData).close();
    logInfo`No reference errors found. (complete data)`;
  } catch (error) {
    showAggregate(error);
    logWarn`Reference errors found. (partial data)`;
  }

  sortWikiDataArrays(wikiData);

  return wikiData;
}
