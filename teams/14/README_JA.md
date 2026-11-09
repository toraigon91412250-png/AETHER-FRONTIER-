# AETHER FRONTIER | No.14 巨大守護ゴーレム「VESTIGE-Ω」

## 納品内容

- `index.html`: 完全なモデルコードを埋め込んだ単体操作デモ。ビルド不要。Cloudflare Pages 直アップロード用。
- `aether-golem.js`: 統合用の独立 ES module。モデル、アニメーション、予兆表示、簡易衝撃波 VFX を内蔵。

**Three.js v0.160.0 を CDN から取得**します。ネット接続が必要です。HTML にモデルスクリプトを埋め込んでいるため、デモ用に別の JS ファイルを同じディレクトリへ置く必要はありません。読み込み失敗時は jsDelivr → unpkg を試します。外部テクスチャ、ビルドツール、追加アプリ、追加課金は不要です。

## モデル概要

- コードネーム：VESTIGE-Ω / 六封結界守護巨像
- スケール：全高 約11m（背面の環状封印装置を含む）。Y軸が上、正面は **-Z**、1単位 ≒ 1m。
- 黒緑の古代石装甲、真鍮色の構造材、エメラルド色の封印結晶。
- 個別ピボット：腰 / 胴 / 首 / 頭 / 左右の股関節 / 膝 / 足首 / 肩 / 肘 / 拳。
- 動作：待機、重歩行、地砕撃、結界波、被弾（攻撃中断）。

## インテグレーション API

```js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { createAetherModule } from './aether-golem.js';

const golem = createAetherModule(THREE, {
  quality: 'low', // 'low' または 'high'
  onEvent(event) {
    if (event.type === 'telegraphStart') {
      // 範囲情報: event.zone, 攻撃名: event.attack
    }
    if (event.type === 'impact') {
      // 実際のダメージ判定は統合側で行う。位置・方向は golem.root の変換を適用。
    }
  }
});
scene.add(golem.root);
golem.root.position.set(20, 0, -30);

// 毎フレーム呼ぶ。秒単位。dtは内部で最大0.05までクランプ。
// 継続モーションと速度は context 経由でも指定可能。
golem.update(dt, { motion: 'walk', walkSpeed: 1.2 });

// 一度きりの操作:
golem.setMotion('idle');      // 'idle' or 'walk'
golem.startAttack('slam');    // 'slam' or 'pulse'。実行できた場合 true
// 攻撃中に再度実行しても false（予兆・衝撃判定の二重発生を防止）
golem.receiveHit({ strength: 1.0 }); // 被弾で攻撃中断

golem.setQuality('high');
const status = golem.getStatus();
const zone = golem.getAttackSpec('slam');

// ステージを削除する場合:
scene.remove(golem.root);
golem.dispose();
```

### 必須互換インターフェース

| 名前 | 役割 |
|---|---|
| `root` | 統合側で scene に追加する Group。世界座標や向きは統合側が管理 |
| `update(dt, context)` | 毎フレーム更新。カメラ・renderer・ゲーム時間を生成しない |
| `setQuality('low'/'high')` | 細部の表示、発光微粒子の切り替え |
| `dispose()` | 全てのモジュール所有 Geometry / Material を開放し root を分離 |

### 追加制御 API

| 名前 | 意味 |
|---|---|
| `setMotion('idle'/'walk')` | 継続モーション選択。移動座標は統合側が制御する |
| `startAttack('slam'/'pulse')` | 単発攻撃。攻撃中や被弾中は `false` |
| `receiveHit({ strength })` | 0.2〜2.2 の強度でリアクション。進行中の攻撃は中断 |
| `getStatus()` | 現在の継続モーション、アクション、品質を返す |
| `getAttackSpec(kind)` | ローカル座標の判定エリア情報を返す（複製されたオブジェクト） |

### イベントと攻撃タイムライン

`onEvent` は `telegraphStart`、`impact`、`attackEnd`、`attackInterrupted`、`hitReact` を通知します。

**地砕撃 (`slam`)**：予兆→1.44秒後に衝撃→2.62秒で終了。正面 -Z 方向のローカル `(0,0,-3.45)` を中心とする半径 3.25m の円。色はオレンジ色。

**結界波 (`pulse`)**：予兆→1.59秒後に衝撃→2.83秒で終了。ゴーレムを中心とした半径 4.2m〜5.5m のドーナツ形状。内側は安全域として表現。色はオレンジ色。

**判定仕様：** モデルは HP・被ダメージ・ヒット判定・AI・音・シーン・カメラ・レンダラーを保有しません。統合側は `impact` 時にのみ判定し、`event.zone` のローカル座標を `golem.root.localToWorld()` 等で世界座標へ変換してください。ボスの回転もその座標変換に反映されます。`attackInterrupted` された攻撃は `impact` を出しません。

## 操作デモ

PC：ドラッグで視点回転、ホイールでズーム。キー `1` 待機 / `2` 歩行 / `Q` 地砕撃 / `E` 結界波 / `H` 被弾 / `L` 画質切り替え。

iPhone Safari：1本指ドラッグで視点回転、2本指でズーム。画面下部のボタンで操作。軽量版が初期選択となります。

## 品質切り替えと検証

- **low:** 追加装飾の非表示、衝撃粒子の省略、デモ側のリアルタイムシャドウ停止、ピクセル比の上限 1.12。
- **high:** 装飾追加、粒子、デモ側のシャドウ描画、ピクセル比の上限 1.65。
- `aether-golem.js` はレンダラー設定に関与しません。統合側で全体の描画品質を制御してください。
- Node.js による構文検査とモック Three.js による動作ロジックテスト（API、予兆、衝撃イベント、攻撃中断、破棄）を実施。
- ブラウザでの最終 WebGL 描画検証および iPhone 16 Safari 実機 fps 測定は未実施です。50/60fps を保証するものではありません。

Cloudflare Pages では ZIP の中の `index.html` をサイトのルートに配置し、ビルド設定なしで公開してください。
