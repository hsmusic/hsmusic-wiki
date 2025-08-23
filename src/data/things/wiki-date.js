import {inspect} from 'node:util';

import Thing from '#thing';
import {isInteger} from '#validators';

function range(a, b) {
  return number => {
    isInteger(number);

    if (number < a || number > b) {
      throw new TypeError(`Must be ${a}-${b}`);
    }

    return true;
  };
}

function rangeDescriptor(a, b) {
  return {
    flags: {update: true, expose: true},
    update: {validate: range(a, b)},
  };
}

function nullableRangeDescriptor(a, b) {
  return rangeDescriptor(a, b);
}

function zeroedRangeDescriptor(a, b) {
  return {
    ...rangeDescriptor(a, b),
    expose: {
      transform: value => value ?? 0,
    },
  };
}

export class WikiDate extends Thing {
  static [Thing.friendlyName] = `Wiki Date`;

  static [Thing.getPropertyDescriptors] = () => ({
    year: {
      flags: {update: true, expose: true},
      update: {validate: isInteger},
    },

    month: nullableRangeDescriptor(0, 11),
    day: nullableRangeDescriptor(1, 31),

    hour: zeroedRangeDescriptor(0, 23),
    minute: zeroedRangeDescriptor(0, 59),
    second: zeroedRangeDescriptor(0, 59),
    millisecond: zeroedRangeDescriptor(0, 999),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Year': {property: 'year'},
      'Month': {property: 'month'},
      'Day': {property: 'day'},
      'Hour': {property: 'hour'},
      'Minute': {property: 'minute'},
      'Second': {property: 'second'},
      'Millisecond': {property: 'millisecond'},
    },
  };

  static propertiesFromDate(date) {
    date = new Date(date);

    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
      millisecond: date.getMilliseconds(),
    };
  }

  static fromDate(date) {
    const wikiDate = Reflect.construct(this);

    Object.assign(WikiDate, this.propertiesFromDate(date));

    return wikiDate;
  }

  toDate() {
    const date = new Date();

    date.setFullYear(
      this.year ?? 1,
      this.month ?? 0,
      this.day ?? 1);

    date.setHours(
      this.hour ?? 0,
      this.minute ?? 0,
      this.second ?? 0,
      this.millisecond ?? 0);

    return date;
  }

  toString() {
    const parts = [];

    // sigh
    const months =
     ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    const has = prop => this[prop] !== null;

    const monthDay =
      (has('month') && has('day')
        ? `${months[this.month]} ${this.day}`
     : has('month')
        ? `${months[this.month]}`
     : has('day')
        ? `Day ${this.day} of no month`
        : null);

    const year =
      (has('year')
        ? `${this.year}`
        : null);

    if (monthDay) {
      parts.push(monthDay);
    }

    if (monthDay && year) {
      if (has('day')) {
        parts.push(', ');
      } else {
        parts.push(' ');
      }
    }

    if (year) {
      parts.push(year);
    }

    const pad = (value, length) =>
      value.toString().padStart(length, '0');

    const millisecond =
      (this.millisecond
        ? `.${pad(this.millisecond, 3)}`
        : '');

    const second =
      (this.second || this.millisecond
        ? `:${pad(this.second, 2)}`
        : '');

    const hourMinute =
      (this.hour || this.minute || this.second || this.millisecond
        ? `${pad(this.hour, 2)}:${pad(this.minute, 2)}`
        : '');

    const time = hourMinute + second + millisecond;

    if (monthDay && time) {
      parts.push(', ');
    } else if (year && time) {
      parts.push(' ');
    }

    if (time) {
      parts.push(time);
    }

    return parts.join('');
  }

  [inspect.custom]() {
    const parts = [];

    parts.push(Thing.prototype[inspect.custom].apply(this));
    parts.push(': ');
    parts.push(this.toString());

    return parts.join('');
  }
}
