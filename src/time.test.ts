import { DateTime } from 'luxon';
import { getIntervals } from './time';
import moment from 'moment';

const ignoreTimes = (): [Date, Date][] => [
  [d('11:30'), d('12:30')],
  [d('18:30'), d('19:30')],
];

const format = (intervals: any[]) =>
  intervals.map((itl) => [
    DateTime.fromMillis(itl.s).toFormat('H:mm'),
    DateTime.fromMillis(itl.e).toFormat('H:mm'),
  ]);

const d = (input: string) => DateTime.fromFormat(input, 'H:mm').toJSDate();
it('常规测试', () => {
  expect(format(getIntervals([d('8:30'), d('19:00')], ignoreTimes()))).toEqual([
    ['8:30', '11:30'],
    ['12:30', '18:30'],
  ]);

  expect(format(getIntervals([d('8:30'), d('19:30')], ignoreTimes()))).toEqual([
    ['8:30', '11:30'],
    ['12:30', '18:30'],
  ]);

  expect(format(getIntervals([d('8:30'), d('20:30')], ignoreTimes()))).toEqual([
    ['8:30', '11:30'],
    ['12:30', '18:30'],
    ['19:30', '20:30'],
  ]);

  expect(format(getIntervals([d('11:30'), d('20:30')], ignoreTimes()))).toEqual(
    [
      ['12:30', '18:30'],
      ['19:30', '20:30'],
    ]
  );

  expect(format(getIntervals([d('11:50'), d('20:30')], ignoreTimes()))).toEqual(
    [
      ['12:30', '18:30'],
      ['19:30', '20:30'],
    ]
  );
});

it('非典型测试', () => {
  //跨天的加班不予考虑..

  //打卡进进出出
  expect(
    format(
      getIntervals(
        [d('8:30'), d('10:00'), d('14:10'), d('19:00')],
        ignoreTimes()
      )
    )
  ).toEqual([
    ['8:30', '11:30'],
    ['12:30', '18:30'],
  ]);
  expect(
    format(
      getIntervals(
        [d('8:20'), d('12:31'), d('18:29:10'), d('18:34')],
        ignoreTimes()
      )
    )
  ).toEqual([
    ['8:20', '11:30'],
    ['12:30', '18:30'],
  ]);
});

it('错误测试', () => {
  expect(() =>
    format(getIntervals([d('20:30'), d('10:30')], ignoreTimes()))
  ).toThrowError(/^invalid activityTimes/);
  expect(() => format(getIntervals([d('20:30')], ignoreTimes()))).toThrowError(
    '打卡次数必须大于两次'
  );

  expect(() =>
    format(
      getIntervals(
        [d('10:30'), d('20:30')],
        [
          [
            moment(d('20:30')).set({ hour: 20, minute: 30 }).toDate(),
            moment(d('10:30')).set({ hour: 10, minute: 30 }).toDate(),
          ],
        ]
      )
    )
  ).toThrowError(/^invalid ignoreTimes/);
});
