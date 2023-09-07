// yaml.js - specification for HSMusic YAML data file format and utilities for
// loading, processing, and validating YAML files and documents

import {readFile, stat} from 'node:fs/promises';
import * as path from 'node:path';
import {inspect as nodeInspect} from 'node:util';

import yaml from 'js-yaml';

import {colors, ENABLE_COLOR, logInfo, logWarn} from '#cli';
import find, {bindFind} from '#find';
import {traverse} from '#node-utils';
import T from '#things';

import {
  conditionallySuppressError,
  decorateErrorWithIndex,
  empty,
  filterProperties,
  mapAggregate,
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
  thingClass,
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
  if (!thingClass) {
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
    const documentEntries = Object.entries(document)
      .filter(([field]) => !ignoredFields.includes(field));

    const unknownFields = documentEntries
      .map(([field]) => field)
      .filter((field) => !knownFields.includes(field));

    if (!empty(unknownFields)) {
      throw new makeProcessDocument.UnknownFieldsError(unknownFields);
    }

    const presentFields = Object.keys(document);

    const fieldCombinationErrors = [];

    for (const {message, fields} of invalidFieldCombinations) {
      const fieldsPresent = presentFields.filter(field => fields.includes(field));

      if (fieldsPresent.length <= 1) {
        continue;
      }

      fieldCombinationErrors.push(
        new makeProcessDocument.FieldCombinationError(
          filterProperties(document, fieldsPresent),
          message));
    }

    if (!empty(fieldCombinationErrors)) {
      throw new makeProcessDocument.FieldCombinationsError(fieldCombinationErrors);
    }

    const fieldValues = {};

    for (const [field, value] of documentEntries) {
      if (Object.hasOwn(fieldTransformations, field)) {
        fieldValues[field] = fieldTransformations[field](value);
      } else {
        fieldValues[field] = value;
      }
    }

    const sourceProperties = {};

    for (const [field, value] of Object.entries(fieldValues)) {
      const property = fieldPropertyMapping[field];
      sourceProperties[property] = value;
    }

    const thing = Reflect.construct(thingClass, []);

    withAggregate({message: `Errors applying ${colors.green(thingClass.name)} properties`}, ({call}) => {
      for (const [property, value] of Object.entries(sourceProperties)) {
        call(() => (thing[property] = value));
      }
    });

    return thing;
  });

  Object.assign(fn, {
    propertyFieldMapping,
    fieldPropertyMapping,
  });

  return fn;
}

makeProcessDocument.UnknownFieldsError = class UnknownFieldsError extends Error {
  constructor(fields) {
    super(`Unknown fields present: ${fields.join(', ')}`);
    this.fields = fields;
  }
};

makeProcessDocument.FieldCombinationsError = class FieldCombinationsError extends AggregateError {
  constructor(errors) {
    super(errors, `Errors in combinations of fields present`);
  }
};

makeProcessDocument.FieldCombinationError = class FieldCombinationError extends Error {
  constructor(fields, message) {
    const fieldNames = Object.keys(fields);
    const combinePart = `Don't combine ${fieldNames.map(field => colors.red(field)).join(', ')}`;

    const messagePart =
      (typeof message === 'function'
        ? `: ${message(fields)}`
     : typeof message === 'string'
        ? `: ${message}`
        : ``);

    super(combinePart + messagePart);
    this.fields = fields;
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

    wallpaperArtistContribsByRef: 'Wallpaper Artists',
    wallpaperStyle: 'Wallpaper Style',
    wallpaperFileExtension: 'Wallpaper File Extension',

    bannerArtistContribsByRef: 'Banner Artists',
    bannerStyle: 'Banner Style',
    bannerFileExtension: 'Banner File Extension',
    bannerDimensions: 'Banner Dimensions',

    commentary: 'Commentary',
    additionalFiles: 'Additional Files',

    artistContribsByRef: 'Artists',
    coverArtistContribsByRef: 'Cover Artists',
    trackCoverArtistContribsByRef: 'Default Track Cover Artists',
    groupsByRef: 'Groups',
    artTagsByRef: 'Art Tags',
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
    duration: 'Duration',
    color: 'Color',
    urls: 'URLs',

    dateFirstReleased: 'Date First Released',
    coverArtDate: 'Cover Art Date',
    coverArtFileExtension: 'Cover Art File Extension',
    disableUniqueCoverArt: 'Has Cover Art', // This gets transformed to flip true/false.

    lyrics: 'Lyrics',
    commentary: 'Commentary',
    additionalFiles: 'Additional Files',
    sheetMusicFiles: 'Sheet Music Files',
    midiProjectFiles: 'MIDI Project Files',

    originalReleaseTrackByRef: 'Originally Released As',
    referencedTracksByRef: 'Referenced Tracks',
    sampledTracksByRef: 'Sampled Tracks',
    artistContribsByRef: 'Artists',
    contributorContribsByRef: 'Contributors',
    coverArtistContribsByRef: 'Cover Artists',
    artTagsByRef: 'Art Tags',
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
    urls: 'URLs',

    date: 'Date',
    coverArtFileExtension: 'Cover Art File Extension',

    featuredTracksByRef: 'Featured Tracks',
    contributorContribsByRef: 'Contributors',
  },
});

export const processFlashActDocument = makeProcessDocument(T.FlashAct, {
  propertyFieldMapping: {
    name: 'Act',
    color: 'Color',
    anchor: 'Anchor',
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

    featuredAlbumsByRef: 'Featured Albums',
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
    divideTrackListsByGroupsByRef: 'Divide Track Lists By Groups',
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
      sourceGroupByRef: 'Group',
      countAlbumsFromGroup: 'Count',
      sourceAlbumsByRef: 'Albums',
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

export function parseContributors(contributors) {
  // If this isn't something we can parse, just return it as-is.
  // The Thing object's validators will handle the data error better
  // than we're able to here.
  if (!Array.isArray(contributors)) {
    return contributors;
  }

  if (contributors.length === 1 && contributors[0].startsWith('<i>')) {
    const arr = [];
    arr.textContent = contributors[0];
    return arr;
  }

  contributors = contributors.map((contrib) => {
    // 8asically, the format is "Who (What)", or just "Who". 8e sure to
    // keep in mind that "what" doesn't necessarily have a value!
    const match = contrib.match(/^(.*?)( \((.*)\))?$/);
    if (!match) {
      return contrib;
    }
    const who = match[1];
    const what = match[3] || null;
    return {who, what};
  });

  const badContributor = contributors.find((val) => typeof val === 'string');
  if (badContributor) {
    throw new Error(`Incorrectly formatted contribution: "${badContributor}".`);
  }

  if (contributors.length === 1 && contributors[0].who === 'none') {
    return null;
  }

  return contributors;
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
          tracksByRef: [],
        };

        const albumRef = T.Thing.getReference(album);

        const closeCurrentTrackSection = () => {
          if (!empty(currentTrackSection.tracksByRef)) {
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
              tracksByRef: [],
            };

            continue;
          }

          trackData.push(entry);

          entry.dataSourceAlbumByRef = albumRef;

          currentTrackSection.tracksByRef.push(T.Thing.getReference(entry));
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
        const origRef = T.Thing.getReference(artist);
        return artist.aliasNames?.map((name) => {
          const alias = new T.Artist();
          alias.name = name;
          alias.isAlias = true;
          alias.aliasedArtistRef = origRef;
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
      let flashesByRef = [];

      if (results[0] && !(results[0] instanceof T.FlashAct)) {
        throw new Error(`Expected an act at top of flash data file`);
      }

      for (const thing of results) {
        if (thing instanceof T.FlashAct) {
          if (flashAct) {
            Object.assign(flashAct, {flashesByRef});
          }

          flashAct = thing;
          flashesByRef = [];
        } else {
          flashesByRef.push(T.Thing.getReference(thing));
        }
      }

      if (flashAct) {
        Object.assign(flashAct, {flashesByRef});
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
      let groupsByRef = [];

      if (results[0] && !(results[0] instanceof T.GroupCategory)) {
        throw new Error(`Expected a category at top of group data file`);
      }

      for (const thing of results) {
        if (thing instanceof T.GroupCategory) {
          if (groupCategory) {
            Object.assign(groupCategory, {groupsByRef});
          }

          groupCategory = thing;
          groupsByRef = [];
        } else {
          groupsByRef.push(T.Thing.getReference(thing));
        }
      }

      if (groupCategory) {
        Object.assign(groupCategory, {groupsByRef});
      }

      const groupData = results.filter((x) => x instanceof T.Group);
      const groupCategoryData = results.filter((x) => x instanceof T.GroupCategory);

      return {groupData, groupCategoryData};
    },
  },

  {
    title: `Process homepage layout file`,
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
    return (x, index, array) => {
      try {
        return fn(x, index, array);
      } catch (error) {
        error.message +=
          (error.message.includes('\n') ? '\n' : ' ') +
          `(file: ${colors.bright(colors.blue(path.relative(dataPath, x.file)))})`;
        throw error;
      }
    };
  }

  for (const dataStep of dataSteps) {
    await processDataAggregate.nestAsync(
      {message: `Errors during data step: ${dataStep.title}`},
      async ({call, callAsync, map, mapAsync, nest}) => {
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

          const yamlResult =
            documentMode === documentModes.oneDocumentTotal
              ? call(yaml.load, readResult)
              : call(yaml.loadAll, readResult);

          if (!yamlResult) {
            return;
          }

          let processResults;

          if (documentMode === documentModes.oneDocumentTotal) {
            nest({message: `Errors processing document`}, ({call}) => {
              processResults = call(dataStep.processDocument, yamlResult);
            });
          } else {
            const {documents, aggregate: aggregate1} = filterBlankDocuments(yamlResult);
            call(aggregate1.close);

            const {result, aggregate: aggregate2} = mapAggregate(
              documents,
              decorateErrorWithIndex(dataStep.processDocument),
              {message: `Errors processing documents`});
            call(aggregate2.close);

            processResults = result;
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

        let files = (
          typeof dataStep.files === 'function'
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
            : dataStep.files
        );

        if (!files) {
          return;
        }

        files = files.map((file) => path.join(dataPath, file));

        const readResults = await mapAsync(
          files,
          (file) => readFile(file, 'utf-8').then((contents) => ({file, contents})),
          {message: `Errors reading data files`});

        let yamlResults = map(
          readResults,
          decorateErrorWithFile(({file, contents}) => ({
            file,
            documents: yaml.loadAll(contents),
          })),
          {message: `Errors parsing data files as valid YAML`});

        yamlResults = yamlResults.map(({file, documents}) => {
          const {documents: filteredDocuments, aggregate} = filterBlankDocuments(documents);
          call(decorateErrorWithFile(aggregate.close), {file});
          return {file, documents: filteredDocuments};
        });

        let processResults;

        if (documentMode === documentModes.headerAndEntries) {
          nest({message: `Errors processing data files as valid documents`}, ({call, map}) => {
            processResults = [];

            yamlResults.forEach(({file, documents}) => {
              const [headerDocument, ...entryDocuments] = documents;

              if (!headerDocument) {
                call(decorateErrorWithFile(() => {
                  throw new Error(`Missing header document (empty file or erroneously starting with "---"?)`);
                }), {file});
                return;
              }

              const header = call(
                decorateErrorWithFile(({document}) =>
                  dataStep.processHeaderDocument(document)),
                {file, document: headerDocument});

              // Don't continue processing files whose header
              // document is invalid - the entire file is excempt
              // from data in this case.
              if (!header) {
                return;
              }

              const entries = map(
                entryDocuments
                  .filter(Boolean)
                  .map((document) => ({file, document})),
                decorateErrorWithFile(
                  decorateErrorWithIndex(({document}) =>
                    dataStep.processEntryDocument(document))),
                {message: `Errors processing entry documents`});

              // Entries may be incomplete (i.e. any errored
              // documents won't have a processed output
              // represented here) - this is intentional! By
              // principle, partial output is preferred over
              // erroring an entire file.
              processResults.push({header, entries});
            });
          });
        }

        if (documentMode === documentModes.onePerFile) {
          nest({message: `Errors processing data files as valid documents`}, ({call}) => {
            processResults = [];

            yamlResults.forEach(({file, documents}) => {
              if (documents.length > 1) {
                call(decorateErrorWithFile(() => {
                  throw new Error(`Only expected one document to be present per file`);
                }), {file});
                return;
              } else if (empty(documents) || !documents[0]) {
                call(decorateErrorWithFile(() => {
                  throw new Error(`Expected a document, this file is empty`);
                }), {file});
              }

              const result = call(
                decorateErrorWithFile(({document}) =>
                  dataStep.processDocument(document)),
                {file, document: documents[0]});

              if (!result) {
                return;
              }

              processResults.push(result);
            });
          });
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
    'flashData',
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
      divideTrackListsByGroupsByRef: 'group',
    }],

    ['albumData', processAlbumDocument, {
      artistContribsByRef: '_contrib',
      coverArtistContribsByRef: '_contrib',
      trackCoverArtistContribsByRef: '_contrib',
      wallpaperArtistContribsByRef: '_contrib',
      bannerArtistContribsByRef: '_contrib',
      groupsByRef: 'group',
      artTagsByRef: 'artTag',
    }],

    ['trackData', processTrackDocument, {
      artistContribsByRef: '_contrib',
      contributorContribsByRef: '_contrib',
      coverArtistContribsByRef: '_contrib',
      referencedTracksByRef: '_trackNotRerelease',
      sampledTracksByRef: '_trackNotRerelease',
      artTagsByRef: 'artTag',
      originalReleaseTrackByRef: '_trackNotRerelease',
    }],

    ['groupCategoryData', processGroupCategoryDocument, {
      groupsByRef: 'group',
    }],

    ['homepageLayout.rows', undefined, {
      sourceGroupByRef: 'group',
      sourceAlbumsByRef: 'album',
    }],

    ['flashData', processFlashDocument, {
      contributorContribsByRef: '_contrib',
      featuredTracksByRef: 'track',
    }],

    ['flashActData', processFlashActDocument, {
      flashesByRef: 'flash',
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

        nest({message: `Reference errors in ${inspect(thing)}`}, ({push, filter}) => {
          for (const [property, findFnKey] of Object.entries(propSpec)) {
            const value = thing[property];

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
                    const original = find.artist(alias.aliasedArtistRef, wikiData.artistData, {mode: 'quiet'});
                    throw new Error(`Reference ${colors.red(contribRef.who)} is to an alias, should be ${colors.green(original.name)}`);
                  }

                  return boundFind.artist(contribRef.who);
                };
                break;

              case '_trackNotRerelease':
                findFn = trackRef => {
                  const track = find.track(trackRef, wikiData.trackData, {mode: 'error'});

                  if (track?.originalReleaseTrackByRef) {
                    // It's possible for the original to not actually exist, in this case.
                    // It should still be reported since the 'Originally Released As' field
                    // was present.
                    const original = find.track(track.originalReleaseTrackByRef, wikiData.trackData, {mode: 'quiet'});

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
                        : colors.green(track.originalReleaseTrackByRef));

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
              if (property === 'sampledTracksByRef') {
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
