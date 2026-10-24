# bootstrap-datepicker 日付範囲フォーム検証

[bootstrap-datepicker](https://github.com/uxsolutions/bootstrap-datepicker) を使った「開始日・終了日」の日付範囲フォームを作り、jQuery と datepicker のバージョンの組み合わせごとに動作を比べた検証用リポジトリです。

主に確認したのは次の2点です。

- jQuery 4 で bootstrap-datepicker 1.9.0 / 1.10.0 がどこまで動くか（jQuery Migrate の警告で確認）
- 範囲指定（`.input-daterange`）でクリアボタンを押したときの挙動と、その対処方法

## 検証パターン

| パターン | jQuery | bootstrap-datepicker | jQuery Migrate | ページ |
|---|---|---|---|---|
| A | 1.12.4 | 1.8.0 | なし | [pattern-a-jq1-bdp1.8.0.html](pattern-a-jq1-bdp1.8.0.html) |
| B | 4.0.0 | 1.9.0 | 4.0.2 | [pattern-b-jq4-bdp1.9.0.html](pattern-b-jq4-bdp1.9.0.html) |
| C | 4.0.0 | 1.10.0 | 4.0.2 | [pattern-c-jq4-bdp1.10.0.html](pattern-c-jq4-bdp1.10.0.html) |

全パターン共通の条件は次のとおりです。

- Bootstrap 3.4.1 は CSS だけを読み込む（Bootstrap の JS は jQuery 4 に対応しておらず、datepicker にも不要）
- 日本語ロケール（`ja`）、表示形式は `yyyy/mm/dd`

## 動かし方

```sh
npm install
npm start   # http://localhost:8080/
```

各ライブラリは npm の alias 機能でバージョンを固定し、複数のバージョンを同時にインストールしています（[package.json](package.json)）。ビルドは不要で、静的な HTML をローカルの HTTP サーバーで配信するだけです。

```json
"jquery1": "npm:jquery@1.12.4",
"jquery4": "npm:jquery@4.0.0",
"jquery-migrate4": "npm:jquery-migrate@4.0.2",
"bdp180": "npm:bootstrap-datepicker@1.8.0",
"bdp190": "npm:bootstrap-datepicker@1.9.0",
"bdp1100": "npm:bootstrap-datepicker@1.10.0"
```

## ファイル構成

```
index.html                     パターン一覧
pattern-a-jq1-bdp1.8.0.html    パターン A
pattern-b-jq4-bdp1.9.0.html    パターン B
pattern-c-jq4-bdp1.10.0.html   パターン C
js/app.js                      共通のフォーム処理（datepicker の初期化、検証、クリア対応）
js/migrate-capture.js          jQuery Migrate の出力を画面にも表示するための補助スクリプト
css/app.css                    画面のスタイル
```

3つのページは、読み込むライブラリのバージョン以外は同じ内容です。

## 画面の機能

- **環境情報**：実際に読み込まれた jQuery・datepicker・Migrate のバージョンを、期待値と並べて表示します。
- **日付範囲フォーム**
  - `.input-daterange` を使い、開始日と終了日を2つの入力欄で指定します。
  - 「送信（検証のみ）」では、必須チェック・日付形式のチェック・開始日 ≤ 終了日のチェックを行います（実際には送信しません）。
  - 「フォームクリア」で、入力をすべて消します。
- **イベントログ**：datepicker の `show` / `hide` / `changeDate` / `clearDate` イベントを時刻付きで表示します。
- **jQuery Migrate 出力**（パターン B / C のみ）：`JQMIGRATE:` で始まる出力を画面に一覧表示します。ブラウザのコンソールにもスタックトレース付きで出力されます（`jQuery.migrateTrace = true`）。

## 検証結果

### jQuery 4 との互換性

パターン B / C で表示された jQuery Migrate の出力です。

| 出力 | B (1.9.0) | C (1.10.0) |
|---|---|---|
| WARN `jQuery.isArray() is removed; use Array.isArray()` | あり | なし |
| WARN `jQuery.isFunction() is removed` | あり | なし |
| INFO `jQuery.proxy() is deprecated` | あり | あり |
| INFO `jQuery.fn.change() event shorthand is deprecated` | あり | あり |

jQuery Migrate を読み込まずに同じ操作をした結果は次のとおりです。

- **1.9.0**：`$.isArray is not a function` のエラーで初期化に失敗し、カレンダーが開きません。jQuery 4 では Migrate が必須です。
- **1.10.0**：Migrate なしでも動作します。残っている `$.proxy` と `.change()` は、jQuery 4 では非推奨扱いで、まだ削除されていません。

datepicker のソースで、該当する API の使用箇所を数えた結果です。

| API | 1.8.0 | 1.9.0 | 1.10.0 |
|---|---|---|---|
| `$.isArray(` | 5 | 5 | 0 |
| `$.isFunction(` | 1 | 1 | 0 |
| `$.proxy(` | 20 | 20 | 20 |
| `.change()` | 3 | 3 | 3 |

### 日付選択の基本動作

3パターンとも同じ結果で、JS エラーは出ませんでした。

- カレンダーは日本語（「2026年10月」「日 月 火 …」）で表示されます。
- 開始日と終了日を選ぶと、その間の日付が範囲として強調表示されます。
- 開始日より前の日付を終了日に選ぶと、開始日もその日付に揃います（datepicker の標準動作）。開始日を終了日より後にした場合も同様です。
- `2026/02/30` のような存在しない日付を手入力すると、フォーカスが外れた時点で `2026/03/02` に繰り越して書き換えられます（datepicker の標準動作）。

## 見つかった問題と対応

### 1. カレンダーのクリアで、もう一方の日付に値が入る

**症状**
- 1.10.0 で、終了日が空のまま開始日をクリアすると、終了日にクリア前の開始日が入る。
- 全バージョンで、もう一方が空の状態で日付を選ぶと、空の側にも同じ日付が自動で入る。

**原因**
`keepEmptyValues` オプションの既定値が `false` のためです。この場合、片方の日付が変わると、datepicker は空になっている他方へ同じ値を書き込みます。

**対応**
初期化時に `keepEmptyValues: true` を指定しました（[js/app.js](js/app.js) の `initDatepicker()`）。

```js
$('#date-range').datepicker({
  language: 'ja',
  format: 'yyyy/mm/dd',
  autoclose: true,
  todayHighlight: true,
  clearBtn: true,
  keepEmptyValues: true,
});
```

### 2. クリア後もカレンダーにクリアした日付の選択表示が残る（1.10.0）

**症状**
1.10.0 で開始日をクリアしても、両方のカレンダーにクリア前の範囲（例: 10日〜20日）の強調表示が残ります。入力欄は空になっています。

**原因**
1.10.0 の `clearDates` は、内部の日付を消す前に `changeDate` を発火します。範囲を更新する処理（`DateRangePicker.dateUpdated` → `updateDates`）はこのイベントで動くため、クリア前の日付で範囲が作られてしまいます。1.8.0 / 1.9.0 では、日付を消してから `changeDate` を発火するので、この問題は起きません。

```js
// 1.9.0
clearDates: function(){
  this.inputField.val('');
  this.update();
  this._trigger('changeDate');
  ...
// 1.10.0
clearDates: function(){
  this.inputField.val('');
  this._trigger('changeDate');
  this.update();
  ...
```

**対応**
`changeDate` と `clearDate` が発火した後に、各入力の現在の値から範囲を作り直す `syncRange()` を追加しました（[js/app.js](js/app.js)）。`clearDate` は、どのバージョンでも内部の日付を消した後に発火します。

- 範囲は入力済みの日付だけで作ります。そのため、クリアした側の表示だけが消え、他方の日付の選択表示は両方のカレンダーに残ります（1.8.0 / 1.9.0 の標準動作と同じ見た目）。
- 範囲の内部データ（`dates`）は、空の位置を詰めずに `undefined` のまま残します。詰めると位置がずれ、次に日付を選んだときに datepicker の前後比較が誤動作して、空の側へ値が書き込まれることがあるためです。

```js
function syncRange() {
  var rangePicker = $('#date-range').data('datepicker');
  if (!rangePicker || !rangePicker.pickers) {
    return;
  }
  var pickers = rangePicker.pickers;
  var dates = [];
  var filled = [];
  for (var i = 0; i < pickers.length; i++) {
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

$('#date-range input').on('changeDate clearDate', syncRange);
```

> **注意**：`syncRange()` は datepicker の内部プロパティ（`pickers`・`dates`・`setRange`）を使っています。公開 API ではないため、datepicker を更新するときは動作を確認し直してください。1.8.0 / 1.9.0 / 1.10.0 では動作を確認済みです。

対応後の表示（3パターン共通）は次のとおりです。

| 操作 | 開始日カレンダー | 終了日カレンダー |
|---|---|---|
| 10〜20日を選択後に開始日をクリア | 20日を選択表示 | 20日が選択中 |
| 10〜20日を選択後に終了日をクリア | 10日が選択中 | 10日を選択表示 |
| 開始日クリア後に15日を選び直す | 15〜20日を範囲表示 | 15〜20日を範囲表示 |

### 3. フォームクリアの追加

開始日・終了日をまとめて消す「フォームクリア」ボタンを追加しました。入力欄の値を直接空にすると、カレンダーの選択状態が残ってしまいます。そのため datepicker の API（`clearDates`）でクリアしています。

```js
$('#form-clear').on('click', function () {
  $('#date-range').datepicker('clearDates');
  $('#validation-result').empty().removeClass('alert alert-success alert-danger');
});
```

両方入力した状態、片方だけ入力した状態、手入力の途中のいずれでも、入力とカレンダーの選択表示がすべて消えます。クリア後に日付を選び直しても、範囲は通常どおり表示されます。

## 確認方法

ここまでの結果は、Playwright（Chromium）で3つのページを操作して確認しました。主に次の項目を確認しています。

- 読み込まれたライブラリのバージョン
- カレンダーの表示と日付選択
- 日付セルに付くクラス（`active` / `selected` / `range` / `range-start` / `range-end`）
- 入力欄の値と、送信時の検証メッセージ
- jQuery Migrate の出力と JS エラーの有無
