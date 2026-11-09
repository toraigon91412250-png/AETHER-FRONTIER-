# AETHER FRONTIER / Team No.05
## ERIDIAN-05「無音の合唱室」

科学技術によって古代の知性を観測していた、地底 1,840m の地下研究施設。単なる展示モデルではなく、移動・操作・封印解除・最深部到達まで遊べる探索ステージ。

## ファイル

- `index.html`：ブラウザで起動できる単体デモ。**Three.js r160 はCDNから読み込む**ため、初回表示時にネット接続が必要。HTMLのビルド工程なし。
- `aether_no05_lab.js`：他チームに組み込むための純粋な Three.js ESM モジュール。Three.js以外の依存なし。
- `module_smoke_test.mjs`：状態遷移、封印、通行判定と経路到達性を検査するNode.js用スタブテスト。**実GPU描画・実機fpsのテストではない**。
- `QA_NOTES.md`：実施済み検査と未検証項目。

独立した単体HTML `AETHER_FRONTIER_No05_ERIDIAN_demo.html` も別途納品。

## 探索・プレイの流れ

1. 初期エアロックから北方向（ワールド -Z）へ進み、中央掘削ハブに入る。
2. 左（ワールド -X）の冷却研究区画：冷却弁 **A → B** の順に操作。
3. 右（ワールド +X）の量子研究区画：**同調器 1 → 2 → 3** を順に操作。
4. ハブ奥（ワールド -Z）の記憶アーカイブ：記憶結晶を復号。
5. 3系統が解除されたらアーカイブ奥の隔壁制御盤で最深部の扉を開く。
6. 最深部にある古代中枢に接続すると探索クリア。中央ハブの西側には任意の隠し研究記録も存在する。

地図には通路、現在地、重要な装置、施錠された隔壁を表示する。

## 単体デモの操作

| 操作 | PC | タッチ端末 |
| --- | --- | --- |
| 移動 | WASD / 矢印 | 左スティック |
| 視点移動 | マウス | 画面右側ドラッグ |
| 装置操作 | E | 「操作」ボタン |
| ジャンプ | Space | 「跳ぶ」ボタン |
| ダッシュ | Shift | 「走る」切替 |
| FPS/TPS | V / 画面ボタン | 画面ボタン |
| 軽量版/高品質版 | Q / 画面ボタン | 画面ボタン |
| 地図切替 | M / 画面ボタン | 画面ボタン |

PCで画面をクリックするとポインターロックを試みる（ブラウザ対応時）。ESCで解除。

## 統合API

```js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { createAetherModule } from './aether_no05_lab.js';

const stage = createAetherModule(THREE, {
  quality: 'low', // 'low' | 'high'
  onEvent: ({type, text, state}) => console.log(type, text, state)
});
scene.add(stage.root);

// 外部のゲームループ側
stage.update(dt, { playerPosition: player.position, quality: 'low' });

// 外部の操作システム側（推奨：移動候補座標を検査）
if (stage.isWalkable(nextX, nextZ, 0.43)) {
  player.position.x = nextX;
  player.position.z = nextZ;
}
const next = stage.getNearestInteractable(player.position, 3.15);
if (pressedInteract && next) stage.interact(player.position, 3.15);

stage.setQuality('high');
// シーン切替時
scene.remove(stage.root);
stage.dispose();
```

必須契約：`createAetherModule(THREE, options)` が `{root, update(dt, context), setQuality(mode), dispose()}` を返す。

追加API：

- `getSpawnPoint()`：ローカル座標の開始位置 `(0, 1.72, 19)`
- `getState()`：3系統の封印、隔壁、最深部、隠し記録などの進行状態コピー
- `getObjective()`：現在の探索目的
- `isWalkable(x, z, radius = 0.4)`：壁、中央遺物、封鎖隔壁を考慮した移動可否
- `interact(playerPosition, maxDistance = 3.15)`：至近の設備を操作。副作用はモジュール内部で閉じる
- `getNearestInteractable(playerPosition, maxDistance = 3.15)`：直近設備のID、名称、距離、ローカル位置
- `getAreas()`：エリアの床面矩形、天井高
- `getOccluders()`：TPSカメラの壁面レイキャスト用配列
- `getNavigationMarkers()`：地図描画用の主要地点リスト
- `getQuality()`：現在の画質プリセット

`onEvent` は `message | warning | success | secret | complete` の `type` と日本語の `text`、現在の進行状態 `state` を渡す。外部UIへの直接書き込みはしない。

## 共通座標系

- Y軸上、**前方 -Z**、ワールド単位 **1 ≈ 1 m**。
- 全ジオメトリは `root` のローカル座標系で制作。`root.position` は統合側で自由に変更可能。
- `isWalkable`、`interact`、`getNearestInteractable` に渡す位置は **ステージのローカル座標**。ルートを移動・回転させて統合する場合は、プレイヤーのワールド座標を `stage.root.worldToLocal(worldPlayer.clone())` で変換すること。
- 施設のXY平面ではなく、床は概ね **Y=0**。水平移動とジャンプ処理は外部制御。
- ワールド外周はX約±74、Z約25〜-163。深度 1,840m は世界観上の設定であり、Y座標を -1840 にしていない。

## 画質と負荷

- `high`：細部装飾、環境粒子と浮遊グリフ表示。単体デモはピクセル比最大1.7、5つの補助ポイントライト。
- `low`：細部装飾と環境粒子を非表示。単体デモはピクセル比最大1.1、主要補助ライト2つに制限。
- 再利用可能な共通ボックスジオメトリ、静的設備のマテリアル単位インスタンシングでGPU呼び出し・メモリ使用を削減。
- ステージ側はレンダラー設定、ポストプロセス、カメラ、入力を一切上書きしない。

**iPhone 16 Safariの50/60fpsは目標であり、実機計測は未実施。** 統合時には負荷が増えるため、No.00側で実機測定・品質調整すること。

## 配布

`index.html` はCloudflare Pagesの直接アップロードに適したルート構成。ビルドコマンド、GitHub、追加アプリ、追加課金は不要。静的HTTPSサイトとして配信すればCDNからThree.jsを読み込める。CDNが使えないネットワークではThree.jsライブラリが読み込まれない。
