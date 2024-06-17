// #composite/data
//
// Entries here may depend on entries in #composite/control-flow.
//

// Utilities which act on generic objects

export {default as withPropertiesFromObject} from './withPropertiesFromObject.js';
export {default as withPropertyFromObject} from './withPropertyFromObject.js';

// Utilities which act on generic lists

export {default as excludeFromList} from './excludeFromList.js';

export {default as fillMissingListItems} from './fillMissingListItems.js';
export {default as withUniqueItemsOnly} from './withUniqueItemsOnly.js';

export {default as withFilteredList} from './withFilteredList.js';
export {default as withMappedList} from './withMappedList.js';
export {default as withSortedList} from './withSortedList.js';

export {default as withPropertyFromList} from './withPropertyFromList.js';
export {default as withPropertiesFromList} from './withPropertiesFromList.js';

export {default as withFlattenedList} from './withFlattenedList.js';
export {default as withUnflattenedList} from './withUnflattenedList.js';


// Utilities which act on slightly more particular data forms
// (probably, containers of particular kinds of values)

export {default as withSum} from './withSum.js';
