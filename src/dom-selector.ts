import moment from 'moment';
import { interval, of, race, timer } from 'rxjs';
import {
  concatAll,
  first,
  map,
  mergeMap,
  skipWhile,
  tap,
} from 'rxjs/operators';
import { getIntervals, Interval } from './time';

interface ParsedData {
  //打卡时间
  active: Date[];
  //有效的上班时间段,是个数组,其中每个对象的数据结构为 {s:number,e:number}. 表示时间段的时间戳
  intervals: (Interval | null)[];
  //日期
  date: Date;
  //日历 dom (内部使用)
  ele: Element;
  //外部修改的加班时间,黑科技,暂不开放
  overrideDuration?: number;
}

export const getDuration = (input: ParsedData) => {
  if (input.overrideDuration) return input.overrideDuration;
  return moment
    .duration(
      input.intervals
        .filter((item) => !!item)
        .reduce((a, c) => a + c!.e - c!.s, 0),
      'milliseconds'
    )
    .asHours();
};

//请假时间
const getAbsentTime = (input: ParsedData, config?: any) => {
  const x =
    config &&
    config[moment(input.date).format('yyyy.M.D')] &&
    config[moment(input.date).format('yyyy.M.D')]['absentHour'];
  return x ?? 0;
};

//判断是否为工作日
const isWorkingDay = (
  now: string,
  excludeDay: number[] = [6, 7],
  config?: any
) => {
  const configValue = config && config[now] && config[now]['workingHour'];
  if (configValue) {
    return configValue > 0;
  }

  return excludeDay.reduce(
    (acc, cur) => acc && moment(now, 'yyyy.M.D').isoWeekday() !== cur,
    true
  );
};

const getExpectWorkingHour = (input: ParsedData, config?: any) => {
  const configValue =
    config &&
    config[moment(input.date).format('yyyy.M.D')] &&
    config[moment(input.date).format('yyyy.M.D')]['workingHour'];

  let validWorkingHour;
  if (configValue) {
    validWorkingHour = Number(configValue) - getAbsentTime(input, config);
  } else {
    //先确定是否是工作日
    const _isWorkingDay = isWorkingDay(
      moment(input.date).format('yyyy.M.D'),
      [6, 7],
      config
    );
    //工作日的期望上班时间为 8 小时减去请假时间
    //非工作日的期望上班时间是 0
    validWorkingHour = _isWorkingDay ? 8 - getAbsentTime(input, config) : 0;
  }
  return validWorkingHour;
};

//获取加班时间
export const getOverTime = (input: ParsedData, config?: any) => {
  //最终的加班时间
  const ot = getDuration(input) - getExpectWorkingHour(input, config);

  //加班时间<0, 大概率这一天缺勤了,而且没有请假
  return Math.max(0, ot);
};

export const toReadableString = (input: ParsedData, config: any) => {
  return `${moment(input.date).format('yyyy.MM.DD')} 工作日?:${isWorkingDay(
    moment(input.date).format('yyyy.M.D'),
    [6, 7],
    config
  )} 工作时间 ${getDuration(input)} 小时 加班时间 ${getOverTime(
    input,
    config
  )}`;
};

export const toTableData = (input: ParsedData, config: any) => {
  const duration = getDuration(input).toFixed(2);
  const startTime = input.active[0]
    ? moment(new Date(input.active[0])).format('HH:mm')
    : '无';
  const endTime = input.active[input.active.length - 1]
    ? moment(new Date(input.active[input.active.length - 1])).format('HH:mm')
    : '无';
  const overTime = getOverTime(input, config).toFixed(2);
  moment(input.date);
  return {
    date: `${moment(input.date).format('yyyy.MM.DD')}-(星期${moment(
      input.date
    ).isoWeekday()})`, //日期
    startTime, //开始时间
    endTime, //结束时间
    expectWorkingHour: getExpectWorkingHour(input, config), //期望工作时间
    duration, //工作时长
    overTime, //加班时间
  };
};
let enableDebug = false;
//获取日历上面的每一天的 dom
const getDaysFromCald = () => {
  return Array.from(document.getElementsByClassName('flatpickr-day'));
};

const debug = (level: 'log' | 'warn' | 'error', ...args: any[]) => {
  if (enableDebug) {
    console[level](...args);
  }
};
//根据指定的日期,轮训那一天的打卡记录,轮训失败反馈 undefined
const getActiveRecords = (targetDate: Date) => {
  const worker = interval(100).pipe(
    skipWhile(() => {
      const textContent = document.querySelector('#monthday')?.textContent;
      const status = document.querySelector('#week > span');
      //只有打卡状态时异常或者正常的才算获取到了结果
      const hasStatus = status &&
        (status.classList.contains('percheckq-normal') ||
          status.classList.contains('percheckq-abnormal'));

      //有打卡状态并且时间一致
      if (textContent && hasStatus) {
        return moment(targetDate).format('MM月DD日') !== textContent
        // return !moment(targetDate).isSame(moment(textContent, 'MM月DD日'));
      }
      return true;
    }),
    map(() => {
      debug('log', `日期匹配,准备查询打卡记录 ${targetDate}`);
      const result = document
        .querySelector('div > div.percheckq-right > div.percheckq-time > ul')
        ?.getElementsByTagName('span');

      return Array.from(result ?? [])
        .map((item) => item.textContent)
        .filter((item) => item)
        .reduce((acc,cur)=> {
          //@ts-ignore
          if(acc.indexOf(cur)<0) acc.push(cur);
          return acc
        },[])
        .map((item) => {
          const d = new Date(item!);

          // 原来的 toJson 时区有问题
          d.toJSON = function () {
            return this.toString();
          };

          return d;
        });
    }),
    first()
  );

  return race(
    worker,
    timer(2000).pipe(
      tap(() => {
        debug('warn', `获取 ${targetDate} 的打卡记录超时`);
      }),
      map((): Date[] => [])
    )
  ).pipe(first());
};

export const refreshCal = (cache: any, extra: any) => {
  const currentDateStr = document.querySelector(
    'div.percheckq-left > div > div.flatpickr-month > span.flatpickr-current-month'
  )?.textContent;
  if (!currentDateStr) return null;

  getDaysFromCald().forEach((day) => {
    const offset = day.classList.contains('prevMonthDay')
      ? -1
      : day.classList.contains('nextMonthDay')
      ? 1
      : 0;
    const cacheKey = moment(currentDateStr, 'yyyy年M月')
      .add(offset, 'month')
      .date(Number(day.textContent!))
      .format('yyyy.MM.DD');
    if (cache[cacheKey]) {
      if (day.getElementsByClassName('ehr_tag').length) {
        day.getElementsByClassName('ehr_tag')[0].textContent = getOverTime(
          cache[cacheKey],
          extra
        ).toFixed(1);
      } else {
        const span = document.createElement('span');
        span.innerText = getOverTime(cache[cacheKey], extra).toFixed(1);
        span.className = 'ehr_tag';
        span.style.position = 'absolute';
        span.style.color = 'red';
        span.style.fontSize = 'smaller';
        day.appendChild(span);
      }
    }
  });
};

export const run = (
  _ifDebug = false,
  cache: any = {},
  ignoreTime: [string, string][] = [
    ['11:30', '12:30'],
    ['18:30', '19:30'],
  ]
) => {
  enableDebug = _ifDebug;
  const currentDateStr = document.querySelector(
    'div.percheckq-left > div > div.flatpickr-month > span.flatpickr-current-month'
  )?.textContent;
  if (!currentDateStr) {
    debug('error', '没有发现日历dom,请确认当前页面处于个人考情查询页面');
  }

  const currentMonthDays = getDaysFromCald()
    //只保留当月日期
    .filter(
      (day) =>
        !(
          day.classList.contains('prevMonthDay') ||
          day.classList.contains('nextMonthDay')
        )
    )
    //包装一个标准 Date
    .map((ele) => ({
      date: moment(currentDateStr! + ele.textContent, 'yyyy年M月DD').toDate(),
      ele,
    }))
    //过滤掉日期晚于今天的
    .filter((item) => moment(new Date()).isAfter(moment(item.date)))
    //过滤时间正常的
    .filter(
      (item) =>
        !cache[moment(item.date).format('yyyy.MM.DD')] ||
        getDuration(cache[moment(item.date).format('yyyy.MM.DD')]) === 0
    )
    //转换成异步逻辑
    .map((item) => {
      debug('log', `注册日期 ${item.date}`);

      return timer(100).pipe(
        mergeMap(() => {
          //@ts-ignore
          item.ele.click();
          debug('log', `点击 ${item.date}`);
          return getActiveRecords(item.date);
        }),
        map((result) => {
          //根据打卡时间计算出勤时间
          if (result && result.length > 1) {
            return {
              ...item,
              active: result,
              intervals: getIntervals(
                result,
                ignoreTime.map(([start, end]) => {
                  return [
                    moment(item.date)
                      .set({
                        hour: moment(start, 'h:mm').hour(),
                        minute: moment(start, 'h:mm').minute(),
                      })
                      .toDate(),
                    moment(item.date)
                      .set({
                        hour: moment(end, 'h:mm').hour(),
                        minute: moment(end, 'h:mm').minute(),
                      })
                      .toDate(),
                  ];
                })
              ),
            };
          } else {
            return {
              ...item,
              active: result,
              intervals: [],
            };
          }
        }),
        tap((item) => {
          cache[moment(item.date).format('yyyy.MM.DD')] = item;
        })
      );
    });

  if (currentMonthDays.length === 0) {
    console.log('处理队列为空,所选的数据全部非法或者已经处理过了');
  }
  //转成异步队列执行
  return of(...currentMonthDays).pipe(concatAll());
};

/**
 *
 */
const getFilterFnFromRange = (range?: { start: string; end: string }) => {
	if(range && range.start && range.end){
		if(range.start.split('.').length !==  range.end.split('.').length){
			throw new Error('开始格式和结束格式不一致. 允许的格式可以为:1991.10.1 或者 10.1. 如果省略年份将按照当前年处理')
		}

		//说明只有月,那么补齐年
		if(range.start.split('.').length === 2){
		const year = new Date().getFullYear().toString();
		range.start = `${year}.${range.start}`
		range.end = `${year}.${range.end}`
		}
	}
  return range &&
    moment(range.start, 'yyyy.M.D').isSameOrBefore(moment(range.end, 'yyyy.M.D'))
    ? (item: ParsedData) => {
        return (
          moment(item.date).isSameOrAfter(moment(range.start, 'yyyy.M.D'), 'day') &&
          moment(item.date).isSameOrBefore(moment(range.end, 'yyyy.M.D'), 'day')
        );
      }
    : (item: ParsedData) => true;
};

/**
 * 根据一个时间段计算总加班时间(单位小时)
 * @param items
 * @param start  结束时间,类似 5.1
 * @param end 开始时间,类似 5.8
 */
export const summary = (
  items: ParsedData[],
  range?: { start: string; end: string }
) => {
  const filterFn = getFilterFnFromRange(range);
  return items.filter(filterFn).reduce((acc, cur) => acc + getDuration(cur), 0);
};

export const summaryOT = (
  items: ParsedData[],
  range?: { start: string; end: string },
  config?: any
) => {
  const filterFn = getFilterFnFromRange(range);
  return items
    .filter(filterFn)
    .reduce((acc, cur) => acc + getOverTime(cur, config), 0);
};

export const table = (
  items: ParsedData[],
  range?: { start: string; end: string },
  config?: any
) => {
  const filterFn = getFilterFnFromRange(range);
  return items.filter(filterFn).map((item) => toTableData(item, config));
};

/**
 *
 * 算出剩余工作日每天还需要工作多久才能达到目标
 * @param items
 * @param range
 */
export const predict = (
  items: ParsedData[],
  now: string,
  targetHour: number,
  range: { start: string; end: string },
  leftWorkingDays?: number
) => {
  const leftHours = targetHour - summary(items, range);
  let _leftWorkingDays = leftWorkingDays ?? getLeftWorkingDays(now, range.end);
  if (_leftWorkingDays === 0) {
    console.log('剩余工作天数为0,所以今天需要完成剩余的所有时间');
    _leftWorkingDays = 1;
  }
  return leftHours / _leftWorkingDays;
};

/**
 * 指定日期每天的平均工作时长（排除了没打卡的天数）
 * @param items
 * @param range
 */
export const averageHoursPerDays = (
  items: ParsedData[],
  range?: { start: string; end: string }
) => {
  const filterFn = getFilterFnFromRange(range);
  const soFarHours = summary(items, range);
  const validDays = items
    .filter(filterFn)
    .filter((item) => getDuration(item) > 0).length;
  return soFarHours / validDays;
};

/**
 * 获取从当前日期（不包括） 到目标日期（包括） 的所有工作天数（默认排除周六和周日）
 * @param now
 * @param end
 * @param excludeDay
 */
export const getLeftWorkingDays = (
  now: string,
  end: string,
  excludeDay: number[] = [6, 7],
  config?: any
) => {
  const leftDays = moment(end, 'yyyy.M.D').diff(moment(now, 'yyyy.M.D'), 'days', true);

  let workingDays = 0;
  for (let i = 1; i <= leftDays; i++) {
    if (
      isWorkingDay(
        moment(now, 'yyyy.M.D').add(i, 'd').format('yyyy.M.D'),
        excludeDay,
        config
      )
    ) {
      workingDays++;
    }
  }
  return workingDays;
};
