/** @module @ndk/fn/datetime */
'use strict';

const padStart = String.prototype.padStart;

class TimeLinePoint {

  /**
   * @class TimeLinePoint
   * @param {string} label
   * @prop {string} label
   */
  constructor(label) {
    this.label = label;
    this.__begin = process.hrtime();
    this.__end = null;
  }

  /**
   * @method TimeLinePoint#end
   */
  end() {
    this.__end = process.hrtime(this.__begin);
  }

  /**
   * @method TimeLinePoint#toString
   * @returns {string}
   */
  toString() {
    let hrtime = this.__end || process.hrtime(this.__begin);
    hrtime = TimeLinePoint.hrtimeToString(hrtime);
    if (this.label) {
      return `${this.label}: ${hrtime}`;
    } else {
      return hrtime;
    }
  }

  /**
   * @method TimeLinePoint#toJSON
   * @returns {string}
   */
  toJSON() {
    return this.toString();
  }

  /**
   * @method TimeLinePoint.end
   * @param {process.hrtime} hrtime
   * @returns {string}
   */
  static hrtimeToString(hrtime) {
    if (hrtime[0] > 0) {
      return `${hrtime[0]}.${padStart.call(hrtime[1] / 1e6 | 0, 3, 0)} sec`;
    } else {
      return `${(hrtime[1] / 1e6 | 0)}.${padStart.call(hrtime[1] % 1e6 / 1e3 | 0, 3, 0)} ms`;
    }
  }

}

class TimeLine extends TimeLinePoint {

  /**
   * @class TimeLine
   * @param {string} label
   * @prop {string} label
   * @prop {Map} points
   */
  constructor() {
    super();
    this.points = new Map();
  }

  /**
   * @method TimeLine#time
   * @param {string} label
   */
  time(label) {
    this.points.set(label, new TimeLinePoint(label));
  }

  /**
   * @method TimeLine#timeEnd
   * @param {string} label
   */
  timeEnd(label) {
    this.points.get(label).end();
  }

  /**
   * @method TimeLine#end
   */
  end() {
    this.points.forEach(point => {
      if (!point.__end)
        point.end();
    });
    super.end();
  }

}

/**
 * @function toDateString
 * @param {Date} [date=new Date()]
 * @param {string} [sep='-']
 * @returns {string}
 */
function toDateString(date, sep = '-') {
  date = date || new Date();
  const year = date.getFullYear();
  const month = padStart.call(date.getMonth() + 1, 2, 0);
  const day = padStart.call(date.getDate(), 2, 0);
  return `${year}${sep}${month}${sep}${day}`;
}

/**
 * @function toTimeString
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
function toTimeString(date) {
  date = date || new Date();
  const hours = padStart.call(date.getHours(), 2, 0);
  const minutes = padStart.call(date.getMinutes(), 2, 0);
  const seconds = padStart.call(date.getSeconds(), 2, 0);
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * @function toTimeStampString
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
function toTimeStampString(date) {
  date = date || new Date();
  const hours = padStart.call(date.getHours(), 2, 0);
  const minutes = padStart.call(date.getMinutes(), 2, 0);
  const seconds = padStart.call(date.getSeconds(), 2, 0);
  const milliseconds = padStart.call(date.getMilliseconds(), 3, 0);
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

exports.TimeLinePoint = TimeLinePoint;
exports.TimeLine = TimeLine;
exports.toDateString = toDateString;
exports.toTimeString = toTimeString;
exports.toTimeStampString = toTimeStampString;
