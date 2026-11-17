# AETHER FRONTIER / No.18 ETHERWEAVE ATMOSPHERE v1.1

**追加開発ミッション No.18・第2陣 / 2026-11-17**

Three.js **0.160.0** / Y up / forward -Z / 1 unit ≈ 1 m / ES module / build free.

## 0. 納品物

- `index.html`: 単体デモ。時刻、天候6種、lite/high、雲海、時刻自動再生、飛行ON/OFF、飛行速度80/220/420m/s、観測高度を変更できる。**No.18ソースをHTML内に埋め込み済み**。
- `aether-atmosphere.js`: 本編用ES module。Three.jsをimportせず、ホストから`THREE`を受け取る。
- `integration-example.html`: モジュールを実際にimportする最小結合例。
- `tests/mock-api.test.mjs`: Node標準テスト。モック環境で基本APIと副作用、画質・雲配置を検証。
- `tests/glsl-smoke.py`: Chromium環境向けGLSLコンパイル・リンク確認用（この実行環境ではWebGL不可）。
- `tests/glsl-smoke.html`: GLSLテストの自動生成HTML。
- `README.md`: 本文。
- `CHANGELOG.md`: v1.0との差分。

`index.html`と`integration-example.html`は**Three.js本体をjsDelivr CDNから読み込む**。初回表示時にインターネット接続が必要。npm/ビルド/新アプリ/有料サービス不要。Cloudflare Pages直接アップロード時はZIP展開後のファイル一式を配置する。

## 1. 最新のGitHub原版・統合版の確認

次の内容を**読み取り専用**で確認し、既存接続を維持した。なおリポジトリへの書き込みは一切していない。

- `teams/18/aether-atmosphere.js`: Git blob SHA `641ca987746c560ce3ac503d22d7857a2b21f99c`。この納品は**そのv1.0から派生**。
- `teams/18/README.md`: SHA `c5b3da8eae4550f0b990d1da37462262b6f8f1a0`。
- `teams/17/aether-performance.js`: SHA `45de79b30ae040c4c39623eac341b6d5fa1be894`。
- `playtest/work20/main.js`: SHA `33ecbdbea64c062a500826ca34a7f2a2e150fa04`。
- `playtest/work20/atmosphere.js`: SHA `c919b4fa195201f53375492d8802ee716fe30892`。
- `playtest/work20/world.js`: SHA `fe4fcfeb2ee9feb3c1fd35271c4b5958b5ab7681`。
- `docs/STEP01_SOURCE_MAP_2026-11-09.md`, `docs/STEP02_COMMON_ADAPTER_2026-11-09.md`。

**現行work20の接続要点**: `loadAetherCompat({id:'18',options:{skyRadius:830,timeOfDay:16.5}})`で生成し、`setAutoCycle(true,420)`、`setCloudSeaLevel(-16)`、`module.update(dt,{camera,quality})`、`getLightingHint()`を使用。No.17側の`registerClient(module.id,module)`で品質を配信している。v1.1もこれらのAPIを継続。ゲーム本編のFogとメイン照明は`playtest/work20/world.js`および`atmosphere.js`が持つ。

## 2. 改良内容

**地表から見た空の奥行き**

- 既存の朝・昼・夕・夜12色調区間、太陽、月、星、シェーダー上層雲、オーロラを維持。
- 低角度で見える空に、広域ヘイズ+極薄の遠景ヘイズを重ねて、地平線を自然につなぐ。
- 霧・嵐による陰りは従来同様に時間と天候で連続補間。ホスト本体の`scene.fog`には触れない。

**天空浮遊島の雲海**

- 雲海シートはカメラを追従するまま、**模様をワールド座標に固定**。移動中のシートの模様の滑り・瞬間的なリセットを抑制。
- 2〜3スケールの雲ノイズ、明暗、淡いシルバーの縁、外周フェードを付与。
- `setCloudSeaLevel`は従来どおり使用でき、浮遊島の下側や高高度に合わせて上下する。

**飛行艇の高速移動**

- 遠景積雲を、ワールドの260m格子セルに紐づく決定論的配置へ変更。元の「視点追従する雲配置」からの改善。
- セル境界で新しい雲が登場する位置は描画フェード終端の外側になるよう設計（完全ゼロは地形や視点、飛行速度などに依存）。
- 雲の描画フェードをGPUシェーダーで計算。天候変化時に雲の**表示個数を増減しない**ため、出現/消失の急変を抑える。
- 全雲インスタンスのCPU行列を更新するのはセルを跨いだとき、雲海高度変更時、画質変更時のみ。**毎フレーム雲を再生成しない**。

**No.17との互換性**

- `setQuality('lite'|'high')`に対応。従来の呼び出しを壊さない。
- No.18自身はピクセル比・カメラ設定・フォグ密度を変更しない。No.17は引き続きレンダリング全体を制御できる。
- `getPerformanceBudget()`でNo.18内部の粒子数・雲数・更新頻度・描画範囲・更新回数を可視化。No.17に渡すためのヒントに過ぎず、No.17へ直接命令しない。
- `getLightingHint()`に`horizonColor`, `suggestedFogColor`, `suggestedFogDensity`, `stormFlashIntensity`を**追加**。従来の戻り値をすべて維持。色はコピーを返し、ホストが採用するか決める。

## 3. 画質予算（設計値）

| 項目 | Lite | High |
|---|---:|---:|
| 雨粒のGPUポイント数 | 320 | 1,120 |
| 遠景積雲（上段+下段インスタンス） | 147 × 2 | 363 × 2 |
| 空・気象パラメーターのCPU更新上限 | 24 Hz | 45 Hz |
| 雲格子の再配置最短間隔 | 140 ms | 55 ms |
| 遠景雲フェード終端距離 | 620 m | 1,150 m |
| 雲海シートの外周フェード終端 | 1,100 m | 1,550 m |
| 雲海ノイズの段数 | 2 | 3 |

空・雲海・上段雲・下段雲・雨はそれぞれ最大5ドローコール相当（無表示時は減少）。インスタンスの形状は低多角形のIcosahedronを共有。雲のレンダリング自体はGPUの毎フレーム処理であり、CPU更新頻度とは異なる。透明物体のオーバードローや高解像度フラグメントシェーダーの負荷はNo.17／実機で別途評価すること。

## 4. 統合API (v1.0互換)

```js
import {createAetherModule} from './aether-atmosphere.js';
const atmosphere=createAetherModule(THREE,{
  quality:'lite',         // 'lite' / 'high'
  weather:'clear',        // clear/cloudy/mist/rain/storm/aurora
  timeOfDay:16.5,        // 0..24
  cloudSea:true,
  cloudSeaLevel:-16,
  autoCycle:true,
  dayLengthSeconds:420,
  skyRadius:830
});
scene.add(atmosphere.root);

// 毎フレーム。cameraは必須級（視点に空と雨を同期）。
atmosphere.update(dt,{camera});

// イベント等で外部から変更
atmosphere.setWeather('storm',3); // true/false
atmosphere.setTimeOfDay(19.2);
atmosphere.setCloudSeaLevel(-70);
atmosphere.setCloudSeaEnabled(true);
atmosphere.setWindSpeed(1.2); // nullなら天候プリセット風速
atmosphere.setAutoCycle(false);
atmosphere.setQuality('high');

const state=atmosphere.getState();
const hint=atmosphere.getLightingHint(); // ホストが採用するか判断
const budget=atmosphere.getPerformanceBudget();

// 終了
atmosphere.dispose(); // 二重呼び出し可、rootも自動で親から外れる
```

- `root/update(dt,context)/setQuality(mode)/dispose()`の共通契約は変更なし。
- `update`は`context.camera`, `context.weather`, `context.timeOfDay`, `context.windSpeed`を認識。従来と同じ。
- `getState()`は従来の主要フィールドを保持。
- カメラ・レンダラー・シーン・メイン照明・scene.fogは**No.18によって作成・上書き・破棄されない**。
- `root.position`が変わった場合は、そのローカル座標系に雲格子が固定される。一般にNo.18の`root`は世界原点へ配置すること。

## 5. No.00 / work20 への具体的な反映提案（このZIPでは未実施）

1. 新しい`aether-atmosphere.js`をバージョン付きの独立格納先へ追加し、動作確認後に`teams/18/aether-atmosphere.js`への切替を検討。**原版はバックアップ**。今回はGitHubに書き込みなし。
2. `playtest/work20/atmosphere.js`の`loadAetherCompat({id:'18'})`を使う場合、レジストリが新ソースを読むよう**統合側の参照先のみ**変更する。`playtest/work20/main.js`のNo.17登録は変更不要。
3. `getLightingHint()`に新設した`hint.suggestedFogColor` / `hint.suggestedFogDensity`を利用する場合、**ホスト内のfog更新箇所を1か所に統一**すること。現行は`world.js.updateVisibility()`でfog density、`atmosphere.js.update()`でfog colorを設定しているため、No.18からは変更しない。
4. `skyRadius:830`、camera.far=1450mの現行値でも空ドームは深度最遠描画される。遠景雲はHighで1,150m先まで描くため、最終LODと描画距離はNo.00側で確認すること。
5. `playtest/work20/atmosphere.js`の室内判定では`module.root.visible=false`だが、通常のNo.18更新自体も省略される。屋外復帰時に時間帯が進む想定なら、外部時刻をコンテキストで毎フレーム設定する運用を推奨。

## 6. テスト結果・未解決

**実行した検証（2026-11-17）**

- `node --check aether-atmosphere.js`: 成功。
- `node --test tests/mock-api.test.mjs`: 11/11 成功。全API、画質切り替え時の描画数、移動セルの更新、天候、時刻、カメラ不変、scene/renderer不変、LightingHint、雲海高度・ON/OFF、異常値、二重disposeを確認。
- `tests/glsl-smoke.py`: 実行したが、**この環境のChromiumではWebGL context自体を取得できず、シェーダーのコンパイル・リンク検証は未完了**。

**未実施・今後の課題**

- Three.js 0.160.0の実ブラウザ描画・画質切替・高速飛行での視覚検証（Chrome WebGLを実行できる環境で確認する必要あり）。
- iPhone 16 Safari実機のfps、過熱、GPU負荷、長時間の飛行テスト。
- work20統合版での天空浮遊島・本物の飛行艇・既存フォグ/都市との重なり確認。
- 高速飛行で新セルが切り替わる境界は遠方フェードで抑えているが、極端な高速移動や瞬間テレポート時の見え方は環境依存。

### 検証用チェックリスト（No.00）

- 地上から時刻を06:00/12:00/18:00/22:00に変更し、天空・太陽・星・月の連続性を確認。
- 浮遊島上で雲海ON/OFF・高度変更・霧・雨・嵐を比較する。
- 飛行ON、速度220/420m/sで前進して遠景雲の突発表示・出現位置・海模様の移動の不自然さを確認。
- lite/high切替時、モデル量と雨粒、草木や建物の見え方の衝突がないか比較する。
- 本体のscene.fog、ambient、sun、rendererの設定がNo.18によって書き換わらないか確認。

このREADMEはコードベースの静的検証とモックテストのみを**完了**として扱う。WebGL表示品質や性能の合格判定は実機検証に委ねる。
