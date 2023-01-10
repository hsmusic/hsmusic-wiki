import {logError} from '../util/cli.js';

function validateWritePath(path, urlGroup) {
  if (!Array.isArray(path)) {
    return {error: `Expected array, got ${path}`};
  }

  const {paths} = urlGroup;

  const definedKeys = Object.keys(paths);
  const specifiedKey = path[0];

  if (!definedKeys.includes(specifiedKey)) {
    return {error: `Specified key ${specifiedKey} isn't defined`};
  }

  const expectedArgs = paths[specifiedKey].match(/<>/g)?.length ?? 0;
  const specifiedArgs = path.length - 1;

  if (specifiedArgs !== expectedArgs) {
    return {
      error: `Expected ${expectedArgs} arguments, got ${specifiedArgs}`,
    };
  }

  return {success: true};
}

function validateWriteObject(obj, {
  urlSpec,
}) {
  if (typeof obj !== 'object') {
    return {error: `Expected object, got ${typeof obj}`};
  }

  if (typeof obj.type !== 'string') {
    return {error: `Expected type to be string, got ${obj.type}`};
  }

  switch (obj.type) {
    case 'legacy': {
      if (typeof obj.write !== 'function') {
        return {error: `Expected write to be string, got ${obj.write}`};
      }

      break;
    }

    case 'page': {
      const path = validateWritePath(obj.path, urlSpec.localized);
      if (path.error) {
        return {error: `Path validation failed: ${path.error}`};
      }

      if (typeof obj.page !== 'function') {
        return {error: `Expected page to be function, got ${obj.content}`};
      }

      break;
    }

    case 'data': {
      const path = validateWritePath(obj.path, urlSpec.data);
      if (path.error) {
        return {error: `Path validation failed: ${path.error}`};
      }

      if (typeof obj.data !== 'function') {
        return {error: `Expected data to be function, got ${obj.data}`};
      }

      break;
    }

    case 'redirect': {
      const fromPath = validateWritePath(obj.fromPath, urlSpec.localized);
      if (fromPath.error) {
        return {
          error: `Path (fromPath) validation failed: ${fromPath.error}`,
        };
      }

      const toPath = validateWritePath(obj.toPath, urlSpec.localized);
      if (toPath.error) {
        return {error: `Path (toPath) validation failed: ${toPath.error}`};
      }

      if (typeof obj.title !== 'function') {
        return {error: `Expected title to be function, got ${obj.title}`};
      }

      break;
    }

    default: {
      return {error: `Unknown type: ${obj.type}`};
    }
  }

  return {success: true};
}

export function validateWrites(writes, {
  functionName,
  urlSpec,
}) {
  // Do a quick valid8tion! If one of the writeThingPages functions go
  // wrong, this will stall out early and tell us which did.

  if (!Array.isArray(writes)) {
    logError`${functionName} didn't return an array!`;
    return false;
  }

  if (!(
    writes.every((obj) => typeof obj === 'object') &&
    writes.every((obj) => {
      const result = validateWriteObject(obj, {
        urlSpec,
      });
      if (result.error) {
        logError`Validating write object failed: ${result.error}`;
        return false;
      } else {
        return true;
      }
    })
  )) {
    logError`${functionName} returned invalid entries!`;
    return false;
  }

  return true;
}
