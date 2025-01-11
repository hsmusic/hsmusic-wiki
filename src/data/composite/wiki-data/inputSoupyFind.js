import {input} from '#composite';
import {anyOf, isFunction, isString} from '#validators';

export default () =>
  input({
    validate:
      anyOf(
        isFunction,
        val => {
          isString(val);

          if (!val.startsWith('_soupyFind:')) {
            throw new Error(`Expected soupyFind.input() token`);
          }

          return true;
        }),
  });

export function getSoupyFindInputKey(value) {
  return value.slice('_soupyFind:'.length);
}
