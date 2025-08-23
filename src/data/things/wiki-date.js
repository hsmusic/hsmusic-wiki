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

function numberDescriptor() {
  return {
    flags: {update: true, expose: true},
    update: {validate: isInteger},
  };
}

function rangeDescriptor(a, b) {
  return {
    flags: {update: true, expose: true},
    update: {validate: range(a, b)},
  };
}

export class WikiDate extends Thing {
  static [Thing.friendlyName] = `Wiki Date`;

  static [Thing.getPropertyDescriptors] = () => ({
    year: numberDescriptor(),
    month: rangeDescriptor(0, 11),
    day: rangeDescriptor(1, 31),
    hour: rangeDescriptor(0, 23),
    minute: rangeDescriptor(0, 59),
    second: rangeDescriptor(0, 59),
    millisecond: rangeDescriptor(0, 999),
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
}
