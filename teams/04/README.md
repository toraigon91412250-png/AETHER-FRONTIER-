# AETHER FRONTIER / Team No.04
## ASTRAEUM | 星環神殿 / Temple of the Three Seals

Three.js 0.160.0 / Y-up / Forward -Z / 1 unit ≈ 1m.

## 納品物
- `ASTRAEUM_demo.html`: ブラウザで単独表示できるデモHTML。Three.js 0.160.0 はCDNから取得するため初回表示時にネット接続が必要。
- `index.html`: Cloudflare Pages へフォルダを直接アップロードするための入口。`aether-temple.js`と同じ場所に置く。
- `aether-temple.js`: 統合用独立モジュール。カメラ・シーン・レンダラー・入力系の生成は行わない。

## コンテンツ
- 神殿外観、20m級の門、開放型の吹き抜け、巨大な回転星環、東西の祭室と側面回廊
- 3つの星印を起動して最深部の封印を解除する探索ギミック
- 下層へ降りる階段、古代記録の残る地下聖域
- 描画切替（low/high）、簡易当たり判定と床高取得、イベント通知
- タッチ移動、画面スワイプ視点、ジャンプ、調べる、FPS/TPS切替

## デモ操作
PC: WASD 移動、Shift 走る、Space ジャンプ、E 調べる、V 視点切替、マウスで視点。スマホ: 左スティック移動、右領域スワイプで視点、画面右下の各操作ボタン。

## 統合 API
```js
const temple = createAetherModule(THREE, {
  quality: 'low',
  origin: { x: 0, y: 0, z: 0 },
  onEvent(e) { console.log(e.type, e); }
});
scene.add(temple.root);

// Each frame
const dt = Math.min(clock.getDelta(), 0.05);
temple.update(dt, { playerPosition: player.position });

// Context action on E / tap
const result = temple.interact(player.position);

// Helpers for external physics and UI
const floorY = temple.getFloorHeight(player.position.x, player.position.z);
const blocked = temple.isBlocked(nextX, nextZ, player.position.y - 1.7, 0.4);
const nearby = temple.nearest(player.position);
const points = temple.getInteractables();
const progress = temple.getState();
temple.setQuality('high'); // 'low' also supported

// On scene teardown
temple.dispose();
```
`update(dt, context)` also accepts `interactionPressed:true` or `interact:true` (rising edge) with `playerPosition`, if the host wants to send input through context instead of `interact()`.

## 統合の注意
- `root.position` は options.origin で初期化。ヘルパーの座標はこれを考慮（rootの回転・拡大縮小はしない）。
- `getFloorHeight()` は簡易床高、`isBlocked()` は主に外壁・封印扉のAABB衝突。厳密な物理・NavMeshはホスト側で補完可能。
- `metadata.bounds` におおまかなローカル範囲を記載。No.00 側は地形との接合・座標配置を管理する。
- `dispose()` はモジュール内で生成したGeometry/Materialを破棄する。共有三次元リソースには触れない。
- 発光演出は主に emissive と数個のデモ側ライトで表現。モジュールにライトを追加していないため照明の最終制御は統合側。
- ビルド工程不要。Three.js自体はCDNから読み込む。Cloudflare Pages の直接アップロードは `index.html` と `aether-temple.js` を同一階層に配置する。
- 実機 iPhone 16 Safari のfpsは未計測。画質モードは見た目と描画量を切り替えるが、パフォーマンス目標の達成は実機確認が必要。
