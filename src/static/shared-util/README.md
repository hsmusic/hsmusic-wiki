# `src/static/shared-util`

Module imports under `src/static/js` may appear to be pointing to files that aren't at quite the right place. For example, the import:

    import {empty} from '../shared-util/sugar.js';

...is reading a file that doesn't exist here, under `shared-util`. This isn't an error!

This folder (`src/shared-util`) does not actually exist in a build of the website; instead, the folder `src/util` is symlinked in its place. So, all files under `src/util` are actually available at (e.g.) `/static/shared-util/` online.

The above import would actually import from the bindings in `src/util/sugar.js`.
