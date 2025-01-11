import {input} from '#composite';
import {isObject} from '#validators';

import {inputSoupyFind} from '#composite/wiki-data';

function soupyFind() {
  return {
    flags: {update: true},
    update: {validate: isObject},
  };
}

soupyFind.input = inputSoupyFind.input;

export default soupyFind;
