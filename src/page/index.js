// NB: This is the index for the page/ directory and contains exports for all
// other modules here! It's not the page spec for the homepage - see
// homepage.js for that.
//
// Each module published in this list should follow a particular format,
// including the following exports:
//
// targets({wikiData})
//     Gets the objects which this page's write() function should be called on.
//     Usually this will simply mean returning the appropriate thingData array,
//     but it may also apply filter/map/etc if useful.
//
// write(thing, {wikiData})
//     Gets descriptors for any page and data writes associated with the given
//     thing (which will be a value from the targets() array). This includes
//     page (HTML) writes, data (JSON) writes, etc. Notably, this function does
//     not perform any file operations itself; it only describes the operations
//     which will be processed elsewhere, once for each translation language.
//     The write function also immediately transforms any data which will be
//     reused across writes of the same page, so that this data is effectively
//     cached (rather than recalculated for each language/write).
//
// As these modules are effectively the HTML templates for all site layout,
// common patterns may also be exported alongside the special exports above.
// These functions should be referenced only from adjacent modules, as they
// pertain only to site page generation.

export * as album from './album.js';
export * as group from './group.js';
export * as track from './track.js';
