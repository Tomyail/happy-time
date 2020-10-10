//https://moment.github.io/luxon/docs/file/src/interval.js
//e_hr 把 Map 方法重写了,luxon 依赖 Map 的各种方法,所以不能直接依赖 luxon..
export interface Interval {
  s: number;
  e: number;
}

const createInterval = (s: number, e: number): Interval => {
  return { s, e };
};
const isValidInterval = (interval: Interval) => {
  return interval.e > interval.s;
};

function isEmpty(target: Interval) {
  return target.s.valueOf() === target.e.valueOf();
}

function overlaps(self: Interval, other: Interval) {
  return self.e > other.s && self.s < other.e;
}

function abutsStart(self: Interval, other: Interval) {
  if (!isValidInterval(self)) return false;
  return +self.e === +other.s;
}

function union(self: Interval, other: Interval) {
  if (!isValidInterval(self)) return self;
  const s = self.s < other.s ? self.s : other.s,
    e = self.e > other.e ? self.e : other.e;
  return createInterval(s, e);
}
const merge = (intervals: Interval[]): Interval[] => {
  //@ts-ignore
  const [found, final] = intervals
    .sort((a, b) => a.s - b.s)
    .reduce(
      //@ts-ignore
      ([sofar, current], item) => {
        if (!current) {
          return [sofar, item];
        } else if (overlaps(current!, item) || abutsStart(current!, item)) {
          return [sofar, union(current!, item)];
        } else {
          return [sofar.concat([current!]), item];
        }
      },
      [[], null]
    );
  if (final) {
    found.push(final);
  }
  return found;
};

function xor(intervals: Interval[]) {
  let start = null,
    currentCount = 0;
  const results = [],
    ends = intervals.map((i) => [
      { time: i.s, type: 's' },
      { time: i.e, type: 'e' },
    ]),
    flattened = Array.prototype.concat(...ends),
    arr = flattened.sort((a, b) => a.time - b.time);

  for (const i of arr) {
    currentCount += i.type === 's' ? 1 : -1;

    if (currentCount === 1) {
      start = i.time;
    } else {
      if (start && +start !== +i.time) {
        results.push(createInterval(start, i.time));
      }

      start = null;
    }
  }

  return merge(results);
}

function intersection(self: Interval, other: Interval) {
  if (!isValidInterval(self)) return self;
  const s = self.s > other.s ? self.s : other.s,
    e = self.e < other.e ? self.e : other.e;

  if (s > e) {
    return null;
  } else {
    return createInterval(s, e);
  }
}

const difference = (current: Interval, intervals: Interval[]) => {
  return xor([current].concat(intervals))
    .map((i) => intersection(current, i))
    .filter((i) => i && !isEmpty(i));
};
export const getIntervals = (
  activityTimes: Date[],
  ignoreTimes: [Date, Date][]
) => {
  if (activityTimes.length <= 1) {
    throw new Error('打卡次数必须大于两次');
  }

  const workingInterval = createInterval(
    activityTimes[0].getTime(),
    activityTimes[activityTimes.length - 1].getTime()
  );

  if (!isValidInterval(workingInterval)) {
    throw new Error(`invalid activityTimes: 结束时间必须大于开始时间`);
  }

  const ignoreIntervals = ignoreTimes.map((ignore) =>
    createInterval(ignore[0].getTime(), ignore[1].getTime())
  );

  const invalidIgnoreTime = ignoreIntervals.find(
    (item) => !isValidInterval(item)
  );

  if (invalidIgnoreTime) {
    throw new Error(`invalid ignoreTimes: 结束时间必须大于开始时间`);
  }
  return difference(workingInterval, [...ignoreIntervals]);
};
