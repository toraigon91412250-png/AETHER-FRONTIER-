# AETHER FRONTIER｜No.10 ARCHAION X 精密化 v2

制作日: 2026-11-17 / Team No.10 / 独立納品（本編未マージ）

## 1. 要点と構成

**既存の「ARCHAION X」の造形・骨格・アニメーション・共通 API を土台に、変形時のポーズを段階的に再構成した改良版**です。原版は [GitHub teams/10/src/aether_no10_robot.js](https://github.com/toraigon91412250-png/AETHER-FRONTIER-/blob/main/teams/10/src/aether_no10_robot.js) で、確認時の原版 Git blob SHA は `e6f214b3374826655d78fdc7c5c15ac49cf2f56c`。ローカル原版も一致確認しました。

- `index.html` / `demo.html`：同内容の操作可能な**単体HTML**。Cloudflare Pagesは `index.html` を入口として使用。ソースを埋め込み済み。Three.js 0.160.0 だけネット接続/CDNが必要。
- `src/aether_no10_robot.js`：ゲーム統合用の ES module。**renderer / camera / scene / keyboard を持たない**。
- `integration-example.html`：インポートと制御の最小例。Cloudflare Pagesへディレクトリごと直接アップロード可。
- `tests/module.test.mjs`：Node標準のtestランナーによる6件のモジュール動作テスト。
- `tests/packaging.test.mjs`：HTMLへの埋め込みとAPIを検査するパッケージ検証。
- `docs/TEST_RESULTS.md`：実施したテストと未実行の検証範囲。
- `docs/No10-v2.patch`：GitHub現行のNo.10モジュールに対する**統合用差分**（参考用）。
- `README.md`：本書。必要なビルド・npmパッケージ・課金は無し。

## 2. 今回改良した範囲

1. **軌道・変形順序**：1本の進捗値 `0..1` に対し、翼付根スライド、頭部格納、胴体前傾、腕展開、脚後方折り、翼2関節展開、翼先端ロックを個別の滑らかな時間窓で制御。各軸の最終値は元の設計を維持し、途中を調整。
2. **接合部**：肩側の翼付根にスライド式のカバーと装甲フェアリングを追加。回転だけでなく翼付根が横に展開し、胴体側との隙間を減らす。中央骨格は増やさず既存 Group を活用。
3. **停止・再開・逆変形**：全ての回転・スライドは進捗から毎回算出。`pauseTransform()` は停止位置を保持、`resumeTransform()` は直前の目標を再利用。停止中に `transformTo()` を呼ぶと新しい方向へ即再開。途中スライダーで任意位置へ移動しても、履歴差分が積み上がらない。
4. **飛行待機・推進**：脚部既存ノズル内に小型イオン流を追加。飛行待機では微弱噴射、`hover` では巡航噴射、追加の `thrust` で強く噴射。地面の `root` アンカーは移動せず、内部モーションだけを変更。
5. **軽量化継続**：従来のジオメトリキャッシュ/共有マテリアルと高密度装飾の可視切替を維持。高品質版で配管・鋲などの詳細を表示し、軽量版で隠す。**表示オブジェクトを隠すだけなので、メモリ全量が減るとは限らない**。

## 3. API（既存互換）

```js
import {createAetherModule} from './src/aether_no10_robot.js';
const u = createAetherModule(THREE,{quality:'lite',initialForm:'robot',motion:'idle'});
scene.add(u.root); // rootの位置・向き・スケールは統合ホストが決める

u.transformTo('flight', 2.8);      // 進捗 1 へ。途中からの反転も可能
u.transformTo('robot', 2.8);       // 進捗 0 へ
u.setTransformProgress(0.45);     // 強制進捗指定、現在位置で一時停止
u.pauseTransform();               // 新規、progress を維持して停止
u.resumeTransform();              // 新規、記憶した直前の目的形態へ再開
u.resumeTransform('robot', 1.5);  // 新規、目標を明示して再開
u.setMotion('idle');              // 既存: idle | walk | hover
u.setMotion('thrust');            // 新規: 強推進演出
u.setQuality('high');             // lite | high（lowもliteの別名として受理）
u.update(dt,{});
const st=u.getState();            // 従来のキーは全て維持
u.dispose();                     // 多重呼び出し可
```

`getState()` の既存キー `moduleId`, `form`, `progress`, `target`, `quality`, `motion`, `dimensions` は保持。追加キーは `version`, `desiredTarget`, `paused`, `transforming`。

- `progress`: 0=人型、1=飛行型。数値は0以上1以下に制限。
- `target`: **既存互換用**の数値。`transformTo('flight')` 後は1、`transformTo('robot')` 後は0。`pauseTransform()` では変更しない。スライダーの `setTransformProgress` は従来どおり target を強制進捗と同じ値にする。
- `desiredTarget`: スライダー操作のあとでも残る「最後に選んだ行き先」。`resumeTransform()` が利用。
- `paused`: 進捗の自動更新を止めているか。`transforming`: 自動で移動中か。呼び出し後、ポーズ自体は静止してもコアの回転や発光は残る。
- `duration`: `transformTo`/`resumeTransform` の第二引数は全区間（0→1）の移動に相当する秒数（0.3～20秒）。途中から再開したら残距離分だけ短くなる。
- `dt` は秒。急激なフレーム飛びで関節が一気に飛ばないよう最大0.1秒まで取り込む。

`update(dt, context)` では次の外部入力を任意で指定可能。

```js
u.update(dt,{
  transformTo:'flight',    // 目的変更時のみ変化を検出
  transformSeconds:2.8,   // transformToの動作秒数
  // transformProgress:.55, // 渡したフレームはスライダー操作と同じ（優先・停止）
  motion:'thrust'          // idle / walk / hover / thrust
});
```

`context.transformProgress` を毎フレーム固定値で渡すと自動進行は止まります。`resumeTransform` のあと自動進行させるには **`context.transformProgress` の送信も止める**こと。`context.transformTo` と `context.transformProgress` を同フレームで渡した場合は外部進捗が優先。

## 4. 本編統合手順（No.00宛）

- **既存の本編を直接改変しない**。No.00側でレビューしたのち、`src/aether_no10_robot.js` を `teams/10/src/aether_no10_robot.js` と比較し、差分を適用する。`docs/No10-v2.patch` も同じ差分。
- 2026-11-17確認時点で `integration/team-registry.mjs` のNo.10 entryは `teams/10/src/aether_no10_robot.js`、`quality:'lite'`、`role:'transformer'`。**変更不要**。
- `integration/aether-compat.mjs` の `createAetherCompat` は `instance` を公開する。既存 `playtest/work20/vehicles.js` は `robot.instance.transformTo()` と `robot.instance.getState().target` を呼ぶため、そのまま互換。ロボットは `root` を受け取り、置き場所は本編 `vehicles.js` が設定。
- 本編が一時停止・再開や強推進を利用する場合のみ、統合側で `robot.instance.pauseTransform() / resumeTransform()` 及び `setMotion('thrust')` を呼ぶUIやイベントを追加する。この納品では `vehicles.js` や `playtest/work20/` は一切更新していない。
- 当たり判定や変形中の操作禁止・乗降・飛行移動の制御は No.00/19側で扱う。本モジュールは変形の見た目を担当し、**root座標もプレイヤー位置も書き換えない**。
- ライブラリは **Three.js r160 (0.160.0)** に統一し、複数のThreeを混ぜない。座標系は+Y上/-Z前、1単位≈1m。

## 5. デモ操作

ドラッグで機体の周囲を回転、ホイール/ピンチでズーム、**人型 / 飛行型**ボタンで自動変形、進捗スライダーで途中姿勢へ移動。**一時停止 / 再開**ボタンで軌道の整合性を確認。**待機 / 歩行 / 浮遊 / 推進**、**軽量 / 高品質**、自転ON/OFFに対応。PCショートカットは R=人型、F=飛行型、Q=画質、P=一時停止/再開、T=推進、Space=自転。

## 6. テスト結果と未確認

実行済み:

- `node --check src/aether_no10_robot.js`：構文PASS。
- `node --check` によるデモ内module script抽出の構文PASS。
- `node --test tests/*.test.mjs`：Nodeの構造モックによる契約・変形完走・中断→再開・任意進捗からの逆転・翼左右対称性/軌道有限性・画質切替・独立インスタンス・disposeの検証。
- 原版と最新GitHubの `teams/10/src/aether_no10_robot.js` のGit blob SHA一致を確認。

未実行 / 未解決:

- **Three.jsの実GPU/WebGL描画で見た目や翼の干渉・隙間を観察するテスト**。現在の制作環境はThree.js CDNが利用できず、このフェーズではブラウザ実描画を行っていない。
- **PC / iPhone 16 SafariでのFPS実測**。描画速度を保証するものではない。
- 飛行操縦、変形時当たり判定、戦闘演出、本編 `playtest/work20/` 接続の実機回帰テストはNo.00で必要。
- ブラウザデモはネットワークからThree.jsを読み込む。オフライン単一HTMLではない（ファイルとしては単一HTML）。ビルドは必要なし。

## 7. 推奨目視チェック

PCとiPhone 16で「人型→途中30%→停止→再開→飛行→推進→人型逆変形」を確認。左右の翼の根元、飛行時の翼先端、胸部と翼裏のすき間、脚とかかとのノズル、最後のロック姿勢、軽量版での形状を重点確認。**品質判定は数値テストに加えて実画面で行う**こと。
