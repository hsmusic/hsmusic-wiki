/** @format */

// NB: This is the index for the page/ directory and contains exports for all
// other modules here! It's not the page spec for the homepage - see
// homepage.js for that.
//
// Each module published in this list should follow a particular format,
// including any of the following exports:
//
// condition({wikiData})
//     Returns a boolean indicating whether to process targets/writes (true) or
//     skip this page spec altogether (false). This is usually used for
//     selectively toggling pages according to site feature flags, though it may
//     also be used to e.g. skip out if no targets would be found (preventing
//     writeTargetless from generating an empty index page).
//
// targets({wikiData})
//     Gets the objects which this page's write() function should be called on.
//     Usually this will simply mean returning the appropriate thingData array,
//     but it may also apply filter/map/etc if useful.
//
// write(thing, {wikiData})
//     Provides descriptors for any page and data writes associated with the
//     given thing (which will be a value from the targets() array). This
//     includes page (HTML) writes, data (JSON) writes, etc. Notably, this
//     function does not perform any file operations itself; it only describes
//     the operations which will be processed elsewhere, once for each
//     translation language.  The write function also immediately transforms
//     any data which will be reused across writes of the same page, so that
//     this data is effectively cached (rather than recalculated for each
//     language/write).
//
// writeTargetless({wikiData})
//     Provides descriptors for page/data/etc writes which will be used
//     without concern for targets. This is usually used for writing index pages
//     which should be generated just once (rather than corresponding to
//     targets).
//
// As these modules are effectively the HTML templates for all site layout,
// common patterns may also be exported alongside the special exports above.
// These functions should be referenced only from adjacent modules, as they
// pertain only to site page generation.

export * as album from './album.js';
export * as albumCommentary from './album-commentary.js';
export * as artist from './artist.js';
export * as artistAlias from './artist-alias.js';
export * as flash from './flash.js';
export * as group from './group.js';
export * as homepage from './homepage.js';
export * as listing from './listing.js';
export * as news from './news.js';
export * as static from './static.js';
export * as tag from './tag.js';
export * as track from './track.js';
