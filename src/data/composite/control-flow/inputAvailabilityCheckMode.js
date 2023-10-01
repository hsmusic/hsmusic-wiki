import {input} from '#composite';
import {is} from '#validators';

export default function inputAvailabilityCheckMode() {
  return input({
    validate: is('null', 'empty', 'falsy'),
    defaultValue: 'null',
  });
}
