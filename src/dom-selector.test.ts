import {
  summary,
  getLeftWorkingDays,
  averageHoursPerDays,
  predict,
} from './dom-selector';
import moment from 'moment';

const testData = [
  [
    {
      active: [],
      date: new Date(),
      ele: null,
      intervals: [{ s: Date.now(), e: Date.now() + 1000 * 60 * 60 }], //一小时
    },
    {
      active: [],
      date: new Date(),
      ele: null,
      intervals: [{ s: Date.now(), e: Date.now() + 1000 * 60 * 60 * 2 }], //两小时
    },
  ],
  [
    {
      active: [],
      date: new Date(),
      //@ts-ignore
      ele: null,
      intervals: [{ s: Date.now(), e: Date.now() + 1000 * 60 * 60 }], //一小时
    },
    {
      active: [],
      date: new Date(),
      //@ts-ignore
      ele: null,
      intervals: [null],
    },
  ],
  [
    {
      active: [],
      date: new Date(),
      //@ts-ignore
      ele: null,
      intervals: [{ s: Date.now(), e: Date.now() + 1000 * 60 * 60 }], //一小时
    },
    {
      active: [],
      date: new Date(Date.now() + 24 * 60 * 60 * 1000 * 2),
      //@ts-ignore
      ele: null,
      intervals: [
        //第二天的
        {
          s: Date.now() + 24 * 60 * 60 * 1000 * 2,
          e: Date.now() + 24 * 60 * 60 * 1000 * 2 + 1000 * 60 * 60, //两小时
        },
      ],
    },
  ],
  [
    {
      active: [],
      date: new Date(),
      //@ts-ignore
      ele: null,
      intervals: [{ s: Date.now(), e: Date.now() + 1000 * 60 * 60 }],
    },
    {
      active: [],
      date: new Date(Date.now() + 24 * 60 * 60 * 1000 * 2),
      //@ts-ignore
      ele: null,
      intervals: [
        //第二天的
        {
          s: Date.now() + 24 * 60 * 60 * 1000 * 2,
          e: Date.now() + 24 * 60 * 60 * 1000 * 2 + 1000 * 60 * 60 * 2,
        },
      ],
    },
  ],
];
it('常规测试', () => {
  //@ts-ignore
  expect(summary(testData[0])).toBe(
    moment.duration(1000 * 60 * 60 * 3, 'milliseconds').asHours()
  );

  expect(
    summary(
      //@ts-ignore
      testData[0],
      {
        start: moment(Date.now()).format('M.D'),
        end: moment(Date.now()).format('M.D'),
      }
    )
  ).toBe(moment.duration(1000 * 60 * 60 * 3, 'milliseconds').asHours());
});

it('非法数据', () => {
  expect(
    //@ts-ignore
    summary(testData[1])
  ).toBe(moment.duration(1000 * 60 * 60, 'milliseconds').asHours());

  expect(
    summary(
      //@ts-ignore
      testData[2],
      {
        start: moment(Date.now()).format('M.D'),
        end: moment(Date.now()).format('M.D'),
      }
    )
  ).toBe(1);

  expect(
    summary(
      //@ts-ignore
      testData[2],
      {
        start: undefined,
        end: undefined,
      }
    )
  ).toBe(2);

  expect(
    summary(
      //@ts-ignore
      testData[3],
      {
        start: moment(Date.now()).format('M.D'),
        end: moment(Date.now() + 24 * 60 * 60 * 1000 * 2).format('M.D'),
      }
    )
  ).toBe(3);
});

describe('getLeftWorkingDays', () => {
  it('常规', () => {
    expect(getLeftWorkingDays('10.6', '10.6')).toBe(0);
    expect(getLeftWorkingDays('10.6', '10.7')).toBe(1);
    expect(getLeftWorkingDays('10.6', '10.8')).toBe(2);
    expect(getLeftWorkingDays('10.6', '10.9')).toBe(3);
    //10号 算周末
    expect(getLeftWorkingDays('10.6', '10.10')).toBe(3);
    expect(getLeftWorkingDays('10.6', '10.18')).toBe(8);
    expect(getLeftWorkingDays('10.6', '10.18')).toBe(8);
    // expect(getLeftWorkingDays('10.8')).toBe(2);
  });
});

describe('averageHoursPerDays', () => {
  it('normal', () => {
    //@ts-ignore
    expect(averageHoursPerDays(testData[0])).toBe(1.5);
    //@ts-ignore
    expect(averageHoursPerDays(testData[1])).toBe(1);
  });
});

describe('predict', () => {
  // it('没有剩余时间了', () => {
  //   expect(
  //     //@ts-ignore
  //     predict(testData[0], Date.now(), 230, {
  //       start: moment(Date.now()).format('M.D'),
  //       end: moment(Date.now()).format('M.D'),
  //     })
  //   ).toBe(230 - 3);
  // });

  it('剩余2天时间了', () => {
    expect(
      getLeftWorkingDays(
        moment('10.5', 'M.D').format('M.D'),
        moment('10.5', 'M.D').add(2, 'd').format('M.D')
      )
    ).toBe(2);

    expect(
      predict(
        //@ts-ignore
        testData[0],
        moment(Date.now()).format('M.D'),
        230,
        {
          start: moment(Date.now()).format('M.D'),
          end: moment(Date.now()).add(2, 'd').format('M.D'),
        },
        2
      )
    ).toBe((230 - 3) / 2);
  });
});
