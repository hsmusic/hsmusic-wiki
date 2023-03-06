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
// dataSteps {...}
//     Object with key-to-functions matching a variety of steps described next.
//     In general, the use of dataSteps is to separate data computations from
//     actual page content generation, making explicit what data is carried
//     from one step to the next, and letting the build/serve mode have a
//     standardized guideline for deciding when to compute data at each step.
//
//     Important notes on the usage of dataSteps:
//
//     - Every dataStep function is provided a `data` object which stores
//       values passed through to that step. To save data for a coming step,
//       just mutate this object (set a key and value on it).
//
//     - Some dataStep functions return values, but not all do. Some are just
//       for computing data used by following steps.
//
//     - Do not set any data properties to live wiki objects or arrays/objects
//       including live wiki objects. All data passed between each step should
//       be fully serializable in JSON or otherwise plain-text format.
//
// **NB: DATA WRITES ARE CURRENTLY DISABLED. All steps exclusively applicable
//   to data writes will currently be skipped.**
//
// dataSteps.computePathsForTargets(data, target)
//     Compute paths at which pages or files will be generated for the given
//     target wiki object, returning {type, path} pairs. Data applied here,
//     such as flags indicating which pages have content, will automatically
//     be passed onto all further steps.
//
// dataSteps.computeDataCommonAcrossMixedWrites(data, target)
//     Compute data which is useful in a mixed list of any path writes.
//     This function should only be used when data is pertinent to more than
//     one kind of write, ex. a variable which is useful for page writes but
//     also exposed through a data write. Data applied here is passed onto
//     all further steps.
//
// dataSteps.computeDataCommonAcrossPageWrites(data, target)
//     Compute data which is useful across more than one page write.
//     Use this function when data is pertinent to more than one page write,
//     but isn't relevant outside of page writes. Data applied here is passed
//     onto further steps for page writes.
//
// dataSteps.computeDataCommonAcrossDataWrites(data, target)
//     Analagous to computeDataAcrossPages; for data writes.
//
// dataSteps.computeDataForPageWrite.[pathKey](data, target, pathArgs)
//     Compute data which is useful for a single given page write.
//     Note that dataSteps.computeDataForPage is an object; its keys are the
//     possible path keys from computePathsForTargets() for page writes.
//     Data applied here is passed onto the final write call for this page.
//
// dataSteps.computeDataForDataWrite.[pathKey](data, target, pathArgs)
//     Analogous to computeDataForPageWrite; for data writes.
//
// dataSteps.computeContentForPageWrite.[pathKey](data, utils)
//     Use data prepared in previous steps to compute and return the actual
//     content for a given page write. The target wiki object is no longer
//     accessible at this step, so all required data must be computed ahead.
//
//     - The returned page object will be destructured for
//       usage in generateDocumentHTML(), `src/write/page-template.js`.
//
//     - The utils object is a set of bound functions handy for any page
//       content. It is described in `src/write/bind-utilities.js`.
//
// dataSteps.compteContentForDataWrite.[pathKey](data, utils)
//     Analogous to computeContentForDataWrite; for data writes.
//     NB: When data writes are enabled, the utils object will be uniquely
//     defined separate from what's provided to page writes.
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
