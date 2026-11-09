# AETHER FRONTIER No.17 / Performance Lab v1.0.0

## 納品物

- `index.html`: 単体デモ。直接Safariで開くか、Cloudflare Pagesに公開可能。1ファイルでデモのHTML/CSS/独自JavaScriptを内包。
- `aether-performance.js`: 他チームから利用する共通最適化モジュール（独立ファイル）。
- `demo.js`: デモ用の浮遊都市シーン、負荷テスト用オブジェクト、カメラ操作、計測UIの独立ソース。
- `test-performance.cjs`: Node.js の標準機能のみで動くロジックテスト。実機のFPSテストではありません。

**外部依存:** 実行時にCDNから `Three.js 0.160.0` の `three.min.js` を読み込みます。デモHTMLは単一ファイルですが**オフライン完結ではありません**。CDNへの接続が必要です。Webアプリのビルド、追加アプリ、有料サービスは不要です。Cloudflare Pages のDirect Uploadに必要な `index.html` をZIP直下に置いています。wrangler設定ファイルはありません。

## モジュールの契約

```javascript
const perf = createAetherModule(THREE, {
  renderer,  // optional; external owner
  camera,    // optional; external owner
  scene,     // optional; unused, reserved for integration
  quality: 'lite',             // 'lite' / 'high'
  adaptive: true,              // optional, default false
  managePixelRatio: true,      // optional, default false
  lodRefreshFrames: 4
});

scene.add(perf.root); // empty integration anchor; not required

perf.setQuality('high');      // quality preset
perf.setAdaptive(true);       // dynamic budgets
perf.getMetrics();            // telemetry
perf.getBudget();             // {mode, detail, dpr, ...}

let last = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - last) / 1000, 0.25);
  last = now;
  // update your game before rendering
  perf.beginFrame();             // optional measurement start
  renderer.render(scene, camera);
  perf.endFrame();               // optional; capture CPU render time/draw calls
  perf.update(dt, {camera, renderer, scene});
}
requestAnimationFrame(animate);

// On final scene destruction only:
perf.dispose(); // restores original pixel ratio if module changed it
// The integration owner disposes its own renderer, camera, geometry, materials.
```

The **required API** is `root`, `update(dt, context)`, `setQuality(mode)`, `dispose()`. The additional public APIs are optional conveniences and compatible with the common contract.

## 他チームのモデルを登録

```javascript
const removeCity = perf.registerClient('team01-city', {
  setQuality(mode) { cityModule.setQuality(mode); },
  setDetail(detail, budget) {
    // detail is 0..1. Adjust instanced-mesh counts, effects and geometry tiers.
    cityModule.setDetail?.(detail);
  }
});

const removeLOD = perf.registerLOD({
  id: 'tower-decor',
  anchor: towerRoot,  // world-space position of the landmark
  hysteresis: 0.10,
  levels: [
    { object: towerHighGroup, maxDistance: 40 },
    { object: towerMediumGroup, maxDistance: 100 },
    { object: towerSimpleGroup, maxDistance: Infinity }
  ]
});

// Before unloading that team:
removeLOD();   // restores prior .visible flags
removeCity();  // stops quality callbacks
```

- LOD distances use world-space Three.js units (project convention: about 1 m per unit).
- LOD groups are **not** reparented. All levels should already be children of their intended model/scene. The controller only changes `.visible` of registered LOD groups.
- `detail` is a normalized budget scalar, not a magic automatic mesh optimizer. Each module chooses how to respond to reduced detail. If an external team uses only `setQuality`, it still gets mode changes, but adaptive geometry-density changes require `setDetail` or LOD registration.
- `setQuality()` accepts `lite` and `high` (aliases `low`, `light`, `quality`). Unknown values produce an error.

## 品質プリセット

| 調整 | LIGHT | HIGH |
|---|---:|---:|
| 性能の目標 | 60 fps、重負荷でも50 fps以上を合格目標 | 50 fps |
| DPR上限 | 1.35 | 2.0 |
| DPR下限（自動調整時） | 0.72 | 0.90 |
| 初期detail | 0.76 | 1.00 |
| detail最小 | 0.30 | 0.44 |
| 1フレームの目標時間 | 約16.67 ms | 20.00 ms |

DPR上限はモジュール起動時に外部レンダラーが設定していた値と端末ネイティブDPRを超えません。`managePixelRatio: false`（デフォルト）では**DPRを一切変更しません**。モジュールは他のレンダラー設定、カメラ、色空間、シャドウ、描画先、アンチエイリアス等を変更しません。

## 動的調整の挙動

- `update` に渡されるフレーム間隔を最大120サンプル保持。バックグラウンド・スリープによる250ms以上の長い間隔は統計から除外。
- 平均フレーム時間とp90（第90百分位）で負荷増大を検知。
- 調整間隔は最低約1.9秒。FPSが低い場合は、ドローコールが多ければ先に詳細度を落とし、それ以外はDPRを段階的に下げる。
- 十分な余裕が続けば約4.2秒以降に詳細度/DPRを緩やかに戻す（ヒステリシス）。
- 自動調整をOFFにすると、その画質モードのプリセットに戻る。
- 自動調整はCPU/描画負荷を軽くする手段であり、あらゆる機種・場面でのFPSを保証するものではありません。

## テレメトリーの読み方

`getMetrics()` の代表フィールド：

| フィールド | 意味 |
|---|---|
| `fps` | 直近フレーム間隔の平均から計算する観測FPS |
| `avgMs` / `p90Ms` / `p95Ms` / `worstMs` | 主にRAF間隔を基にした実時間。GPUだけの時間ではない |
| `renderCpuMs` | `beginFrame()` / `endFrame()` 間のCPU側経過時間。`renderer.render` のGPU処理時間ではない |
| `drawCalls`, `triangles` | `renderer.info.render` の値。`endFrame()` を描画直後に呼ぶ前提 |
| `geometries`, `textures` | `renderer.info.memory` の値 |
| `dpr` | レンダラーの現在のpixelRatio |
| `detail`, `mode`, `adaptive`, `targetFPS`, `tuning` | 現在の品質コントローラー状態 |

WebGL GPUタイマー拡張による正確なGPU経過時間の計測は実装していません。測定値を混同しないよう、表示は「RENDER CPU」としています。

## 単体デモの操作

- `LIGHT / 軽量` と `HIGH / 高品質` の画質切り替え。
- `動的調整を有効化` のON/OFF。OFFにするとプリセットに戻ります。
- `STRESS TEST` を標準／高負荷／極限テストに変更し、可視の個別メッシュ数を増やしてドローコール負荷を段階的に増加。
- 画面ドラッグで視点回転、スクロール／2本指ピンチでズーム、視点リセット。
- FPS、平均／P95フレーム時間、フレーム時間ヒストリー、DPR、DETAIL、draw calls、triangles、CPU render時間をライブ表示。

## テストの範囲

`node test-performance.cjs` のユニットテストを実施（Node.js内のThree互換ダミーオブジェクトでAPI動作を検証）。

検証対象：初期化、LIGHT/HIGHプリセット、クライアント登録と通知、LOD距離切り替え、LOD解除時のvisibility復元、フレームサンプル、CPU時間、render.info取得、遅延時の詳細度低下、自動調整停止、dispose時DPR復帰。

**未測定:** 実際のiPhone 16 / SafariのFPS、WebGL描画の実動作、描画画質、統合後の最大負荷。ブラウザ検証ツールのローカルページアクセス制限により、Three.jsの実レンダリングまでのE2E検証は完了していません。性能合格にはiPhone 16実機で下記テストが必要です。

## iPhone 16 Safari 合格手順（総監督向け）

1. Cloudflare PagesへZIPを直接アップロードし、Safariで公開URLを開く。`index.html` も直接開けます（CDN接続必須）。
2. LIGHTとHIGHの各モードを切り替え、実際のホーム画面/探索/戦闘相当の3場面を用意する。
3. 各場面を約60秒以上操作し、FPSとP95を確認。初回読み込みの数秒とバックグラウンド復帰直後を通常のゲーム負荷判定から分ける。
4. LIGHTで通常60fpsを目指し、最も重い場面でも実測50fps以上かを確認。HIGHでは50fps付近を目標にし、画質低下/段付きや描画欠損も視覚確認。
5. 合格しなければ描画距離・可視オブジェクト・マテリアル・透過・シャドウ・ポストプロセス・ドローコールなどを他チームと調整する。パフォーマンス制御だけで目標を保証しない。

## 統合・所有権の注意

- `aether-performance.js` はrenderer、scene、cameraを生成も破棄もしません。外部設定に無許可で触れないよう `managePixelRatio` はデフォルトOFFです。
- 複数パフォーマンス制御モジュールが**同じrenderer**のDPRを変更しないよう、総監督が一つだけ所有してください。
- `renderer.info` は描画パスやrenderer.info.autoResetの設定により値の意味が変わるため、`endFrame()` は最終の描画直後に呼び、統合側で複数パスの場合は別計測を考慮してください。
- Scene change時にユーザー所有オブジェクトやgeometry/materialのdisposeは呼びません。モジュール内のLOD visibilityとDPRを復元して参照を解除します。
