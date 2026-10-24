/*
 * jQuery Migrate の出力（"JQMIGRATE: ..."）を画面表示用に捕捉する。
 * Migrate 読み込み時点から警告を拾えるよう、jQuery より前に読み込むこと。
 * コンソールへの出力はそのまま残す。
 */
(function (window) {
  'use strict';

  var console = window.console;
  var captured = [];
  var listeners = [];

  function wrap(method) {
    var original = console[method];
    if (!original) {
      return;
    }
    console[method] = function () {
      var first = arguments[0];
      if (typeof first === 'string' && first.indexOf('JQMIGRATE:') === 0) {
        var entry = { level: method, message: first, time: new Date() };
        captured.push(entry);
        for (var i = 0; i < listeners.length; i++) {
          listeners[i](entry);
        }
      }
      return original.apply(console, arguments);
    };
  }

  // console.trace は migrateTrace によるスタック出力。重複表示になるため捕捉しない
  wrap('log');
  wrap('info');
  wrap('warn');

  window.MigrateCapture = {
    entries: captured,
    onMessage: function (fn) {
      listeners.push(fn);
    },
    clear: function () {
      captured.length = 0;
    }
  };
})(window);
