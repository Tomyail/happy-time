// ==UserScript==
// @name         EHR_Happy_Time
// @namespace    http://tampermonkey.net/
// @version      0.15.0
// @description  自动获取 ehr 系统的工作时间
// @author       tomyail
// @match        *://*/*
// @license      CC-BY-SA-3.0; http://creativecommons.org/licenses/by-sa/3.0/
// @license      MIT
// @grant GM_addStyle
// @grant GM_deleteValue
// @grant GM_listValues
// @grant GM_addValueChangeListener
// @grant GM_removeValueChangeListener
// @grant GM_setValue
// @grant GM_getValue
// @grant GM_log
// @grant GM_getResourceText
// @grant GM_getResourceURL
// @grant GM_registerMenuCommand
// @grant GM_unregisterMenuCommand
// @grant GM_openInTab
// @grant GM_xmlhttpRequest
// @grant GM_download
// @grant GM_getTab
// @grant GM_saveTab
// @grant GM_getTabs
// @grant GM_notification
// @grant GM_setClipboard
// @grant GM_info
// @grant  window.focus
// @require https://unpkg.com/@reactivex/rxjs@6.6.3/dist/global/rxjs.umd.js
// @require https://code.jquery.com/jquery-1.9.1.min.js
// @require https://cdn.jsdelivr.net/npm/moment@2.29.0/moment.min.js
// @require https://cdn.jsdelivr.net/npm/@tomyail/happy-time@1.3.0/dist/index.umd.js
// ==/UserScript==

(function () {
  'use strict';

  let isInited = false;
  let cache = localStorage.getItem('__ehr_cache')
    ? JSON.parse(localStorage.getItem('__ehr_cache'))
    : {};

  let extra_config = localStorage.getItem('__ehr_cache_extra')
    ? JSON.parse(localStorage.getItem('__ehr_cache_extra'))
    : {};
  setInterval(() => {
    const targetDom = document.querySelector(
      '#app_220103 > div > div.percheckq-left > div > div.flatpickr-month'
    );

    if (
      ((targetDom && targetDom.children) ||
        localStorage.getItem('__ehr_cache')) &&
      !isInited
    ) {
      console.log(`脚本已注册完毕\n
        __ehr_summary("9.16","10.15");// 获取考情周期内的总工作时长\n
        __ehr_predict("10.7",185,"9.16","10.15");// 预测剩余的考勤周期每天需要工作多久才能满足目标工作小时数(当前时间,考勤总工作数,考勤开始日期,考勤结束日期) \n
        __ehr_predict("10.7",185,"9.16","10.15",5);// 预测函数式基于 1-5 是工作日,6,7 是周末的方式计算剩余应该工作天数的. 如果你需要自定义剩余的工作天数,最后一个参数传天数就好了(这个例子是 5 天)
        __ehr_averageHoursPerDays("9.16","10.15");// 获取每天的平均工作小时数

        __ehr_set_workingHour('10.20') //强制设置 10.20 为工作日
        __ehr_set_absentHour('10.20',8|4|0) //设置 10.20 的请假时间为 8|4|0 小时
        `);

      unsafeWindow.extra_config = extra_config;
      unsafeWindow.__ehr_cache = cache;
      unsafeWindow.__ehr_set_workingHour = (date, hour) => {
        if (hour !== 0 || hour !== 8 || !hour) {
          console.error('工作时间只能是 0 或者 8');
        }

        extra_config[date] = {
          ...extra_config[date],
          workingHour: hour && 8,
        };
      };

      unsafeWindow.__ehr_set_absentHour = (date, hour) => {
        if (hour !== 0 || hour !== 8 || hour !== 4) {
          console.error('加班时间只能是 0,8,4');
        }

        extra_config[date] = {
          ...extra_config[date],
          absentHour: hour,
        };
      };
      unsafeWindow.__ehr_summary = (start, end) => {
        if (start) {
          localStorage.setItem('__ehr_cache_start', start);
        } else if (localStorage.getItem('__ehr_cache_start')) {
          start = localStorage.getItem('__ehr_cache_start');
        }
        if (end) {
          localStorage.setItem('__ehr_cache_end', end);
        } else if (localStorage.getItem('__ehr_cache_end')) {
          end = localStorage.getItem('__ehr_cache_end');
        }
        console.table(
          window.happyTime.table(Object.values(cache), { start, end })
        );
        console.log(
          `总工作时间(${start}-${end}): ${window.happyTime.summary(
            Object.values(cache),
            {
              start: start,
              end: end,
            }
          )}`,
          `总加班(${start}-${end}): ${window.happyTime.summaryOT(
            Object.values(cache),
            {
              start: start,
              end: end,
            },
            extra_config
          )}`
        );
      };

      unsafeWindow.__ehr_predict = (
        now,
        targetHours,
        start,
        end,
        leftWorkingDays
      ) => {
        return `剩余工作日每天需要工作 ${window.happyTime.predict(
          Object.values(cache),
          now,
          targetHours,
          {
            start,
            end,
          },
          leftWorkingDays
        )} 小时才能满足目标`;
      };

      unsafeWindow.__ehr_averageHoursPerDays = (start, end) => {
        return `每天的平均工作时间(${start}-${end}): ${window.happyTime.averageHoursPerDays(
          Object.values(cache),
          { start, end }
        )}`;
      };

      unsafeWindow.__ehr_clearCache = () => {
        localStorage.clear();
        cache = {};
        extra_config = {};
      };

      isInited = true;
    }
    if (targetDom && targetDom.children && targetDom.children.length <= 3) {
      const btn = document.createElement('button');
      btn.innerText = 'search';
      btn.addEventListener('click', () => {
        window.happyTime
          .runForEHR(
            false,
            cache,
            [
              ['12:00', '13:00'],
              ['18:30', '19:30'],
            ],
            extra_config
          )
          .subscribe(
            (x) =>
              console.log(window.happyTime.toReadableString(x, extra_config)),
            (x) => console.error(x),
            () => {
              localStorage.setItem('__ehr_cache', JSON.stringify(cache));
              console.log(unsafeWindow.__ehr_summary());
            }
          );
      });
      targetDom.append(btn);
    }
    if (targetDom) {
      window.happyTime.refreshCal(cache, extra_config);
    }
  }, 1000);
})();
