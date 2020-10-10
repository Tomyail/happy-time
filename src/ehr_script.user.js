// ==UserScript==
// @name         EHR_Happy_Time
// @namespace    http://tampermonkey.net/
// @version      0.10.0
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
// @require https://cdn.jsdelivr.net/npm/@tomyail/happy-time@1.2.9/dist/index.umd.js
// ==/UserScript==

(function () {
  'use strict';

  setInterval(() => {
    const targetDom = document.querySelector(
      '#app_220103 > div > div.percheckq-left > div > div.flatpickr-month'
    );
    let cache = localStorage.getItem('__ehr_cache')
      ? JSON.parse(localStorage.getItem('__ehr_cache'))
      : {};
    if (targetDom && targetDom.children && targetDom.children.length <= 3) {
      console.log(`脚本已注册完毕\n
      __ehr_summary("9.16","10.15");// 获取考情周期内的总工作时长\n
      __ehr_predict("10.7",185,"9.16","10.15");// 预测剩余的考勤周期每天需要工作多久才能满足目标工作小时数(当前时间,考勤总工作数,考勤开始日期,考勤结束日期) \n
      __ehr_predict("10.7",185,"9.16","10.15",5);// 预测函数式基于 1-5 是工作日,6,7 是周末的方式计算剩余应该工作天数的. 如果你需要自定义剩余的工作天数,最后一个参数传天数就好了(这个例子是 5 天)
      __ehr_averageHoursPerDays("9.16","10.15");// 获取每天的平均工作小时数
      `);

      unsafeWindow.__ehr_cache = cache;
      unsafeWindow.__ehr_summary = (start, end) =>
        `总工作时间(${start}-${end}): ${window.happyTime.summary(
          Object.values(cache),
          {
            start: start,
            end: end,
          }
        )}`;

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
      };

      const btn = document.createElement('button');
      btn.innerText = 'search';
      btn.addEventListener('click', () => {
        window.happyTime.runForEHR(false, cache).subscribe(
          (x) => console.log(window.happyTime.toReadableString(x)),
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
      window.happyTime.refreshCal(cache);
    }
  }, 1000);
})();
