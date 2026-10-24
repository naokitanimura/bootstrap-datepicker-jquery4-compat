/*
 * 日付範囲フォームの共通ロジック。
 * jQuery 1.x でも動くよう ES5 で記述している。
 */
(function ($, window) {
  'use strict';

  var DATE_FORMAT = 'yyyy/mm/dd';
  var DATE_PATTERN = /^(\d{4})\/(\d{2})\/(\d{2})$/;

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function formatTime(d) {
    return (
      pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
    );
  }

  function formatDate(d) {
    return d
      ? d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate())
      : '(なし)';
  }

  // "yyyy/mm/dd" を実在日付として解釈する。不正なら null
  function parseDate(text) {
    var m = DATE_PATTERN.exec(text);
    if (!m) {
      return null;
    }
    var y = parseInt(m[1], 10);
    var mo = parseInt(m[2], 10) - 1;
    var d = parseInt(m[3], 10);
    var date = new Date(y, mo, d);
    if (
      date.getFullYear() !== y ||
      date.getMonth() !== mo ||
      date.getDate() !== d
    ) {
      return null;
    }
    return date;
  }

  function renderEnvironment() {
    var expected = $('body').data('expected') || {};
    var rows = [
      ['jQuery', $.fn.jquery, expected.jquery],
      [
        'bootstrap-datepicker',
        $.fn.datepicker && $.fn.datepicker.version,
        expected.datepicker,
      ],
      [
        'jQuery Migrate',
        $.migrateVersion || '(未使用)',
        expected.migrate || '(未使用)',
      ],
    ];
    var $tbody = $('#env-table tbody');
    $.each(rows, function (_, row) {
      var actual = row[1] || '(取得不可)';
      var ok = !row[2] || actual === row[2];
      $('<tr>')
        .toggleClass('danger', !ok)
        .append($('<th>').text(row[0]))
        .append($('<td>').text(actual))
        .append($('<td>').text(row[2] || '-'))
        .appendTo($tbody);
    });
  }

  function appendLog(text) {
    var $log = $('#event-log');
    $('<li>')
      .text('[' + formatTime(new Date()) + '] ' + text)
      .prependTo($log);
  }

  // 範囲の強調表示を各入力の現在値から作り直す。
  // 1.10 の clearDates は日付を消す前に changeDate を発火するため、クリア前の日付で範囲が作られて
  // クリアした日付の選択表示が残る。入力済みの日付だけで範囲を作り、他方の選択表示は残す。
  function syncRange() {
    var rangePicker = $('#date-range').data('datepicker');
    if (!rangePicker || !rangePicker.pickers) {
      return;
    }
    var pickers = rangePicker.pickers;
    var dates = [];
    var filled = [];
    for (var i = 0; i < pickers.length; i++) {
      // 空の位置は undefined のまま残し、dateUpdated の前後比較で他方が書き換わらないようにする
      dates[i] = pickers[i].getUTCDate() || undefined;
      if (dates[i]) {
        filled.push(dates[i].valueOf());
      }
    }
    rangePicker.dates = dates;
    for (var j = 0; j < pickers.length; j++) {
      pickers[j].setRange(filled);
    }
  }

  function initDatepicker() {
    var labels = { 'start-date': '開始日', 'end-date': '終了日' };

    $('#date-range').datepicker({
      language: 'ja',
      format: DATE_FORMAT,
      autoclose: true,
      todayHighlight: true,
      clearBtn: true,
      // 片方の日付を変更・クリアしたとき、空の他方へ値を自動入力させない
      keepEmptyValues: true,
    });

    $('#date-range input')
      .on('show hide clearDate', function (e) {
        appendLog(labels[this.id] + ': ' + e.type);
      })
      .on('changeDate', function (e) {
        appendLog(labels[this.id] + ': changeDate → ' + formatDate(e.date));
      })
      // datepicker 側の範囲更新（初期化時に登録済みの changeDate ハンドラ）の後に補正する
      .on('changeDate clearDate', syncRange);
  }

  function validate() {
    var errors = [];
    // $.trim は jQuery 4 で削除済み。アプリ側から Migrate 警告を出さないよう自前で trim する
    var startText = String($('#start-date').val()).replace(/^\s+|\s+$/g, '');
    var endText = String($('#end-date').val()).replace(/^\s+|\s+$/g, '');

    var start = null;
    var end = null;

    if (!startText) {
      errors.push('開始日を入力してください。');
    } else if (!(start = parseDate(startText))) {
      errors.push('開始日は yyyy/mm/dd 形式の正しい日付で入力してください。');
    }
    if (!endText) {
      errors.push('終了日を入力してください。');
    } else if (!(end = parseDate(endText))) {
      errors.push('終了日は yyyy/mm/dd 形式の正しい日付で入力してください。');
    }
    if (start && end && start.getTime() > end.getTime()) {
      errors.push('終了日は開始日以降の日付を指定してください。');
    }

    return { errors: errors, start: start, end: end };
  }

  function initForm() {
    $('#range-form').on('submit', function (e) {
      e.preventDefault();
      var result = validate();
      var $result = $('#validation-result')
        .empty()
        .removeClass('alert-success alert-danger');

      if (result.errors.length) {
        var $ul = $('<ul>');
        $.each(result.errors, function (_, msg) {
          $('<li>').text(msg).appendTo($ul);
        });
        $result.addClass('alert alert-danger').append($ul);
      } else {
        var days = Math.round((result.end - result.start) / 86400000) + 1;
        $result
          .addClass('alert alert-success')
          .text(
            'OK: ' +
              formatDate(result.start) +
              ' 〜 ' +
              formatDate(result.end) +
              '（' +
              days +
              '日間）',
          );
      }
      appendLog(
        '送信: ' +
          (result.errors.length ? 'NG (' + result.errors.length + '件)' : 'OK'),
      );
    });

    // 入力値を直接空にするとカレンダーの選択状態が残るため、datepicker の API でクリアする
    $('#form-clear').on('click', function () {
      $('#date-range').datepicker('clearDates');
      $('#validation-result').empty().removeClass('alert alert-success alert-danger');
      appendLog('フォームクリア');
    });

    $('#clear-log').on('click', function () {
      $('#event-log').empty();
    });
  }

  function initMigratePanel() {
    var $panel = $('#migrate-panel');
    if (!$panel.length) {
      return;
    }
    var capture = window.MigrateCapture;
    var $list = $('#migrate-log');

    function addEntry(entry) {
      var cls = entry.level === 'warn' ? 'text-danger' : 'text-muted';
      $('<li>')
        .addClass(cls)
        .text(
          '[' +
            formatTime(entry.time) +
            '] ' +
            entry.level.toUpperCase() +
            ' ' +
            entry.message,
        )
        .appendTo($list);
      updateCount();
    }

    function updateCount() {
      var messages = $.migrateMessages || [];
      $('#migrate-count').text(messages.length);
    }

    if (capture) {
      $.each(capture.entries, function (_, entry) {
        addEntry(entry);
      });
      capture.onMessage(addEntry);
    }
    updateCount();

    $('#migrate-reset').on('click', function () {
      if ($.migrateReset) {
        $.migrateReset();
      }
      if (capture) {
        capture.clear();
      }
      $list.empty();
      updateCount();
    });
  }

  $(function () {
    initMigratePanel();
    renderEnvironment();
    initDatepicker();
    initForm();
  });
})(jQuery, window);
