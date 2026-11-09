# No.13｜本編統合仕様

## API

```js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import {createAetherModule} from './src/aether-dragon.js';

const dragon = createAetherModule(THREE, {quality: 'low'});
scene.add(dragon.root);

// 本編のレンダーループ内
const dt = clock.getDelta();
dragon.update(dt, {phase: bossAI.visualState});

// 設定切替
dragon.setQuality('high'); // 'low' or 'high'

// モデルのみを制御する場合
// dragon.setPhase('roar');

// ステージ切替時
dragon.dispose();
```

`createAetherModule(THREE, options)` の戻り値：

| フィールド | 内容 |
| --- | --- |
| `root` | THREE.Group。統合側がシーンに追加／移動／回転／拡大縮小する |
| `update(dt, context={})` | 経過秒数と外部状態で可動部更新。`dt` は0〜0.075秒でクランプ |
| `setQuality(mode)` | `'high'` または `'low'`（`'lite'`もlow扱い） |
| `dispose()` | 自身が生成したGeometry/Materialを破棄。二重呼び出し安全 |
| `setPhase(name)` | 表示モーション切替。オプション機能 |
| `anchors` | ボス演出位置の参照。head/mouth/core/tail/wingLeft/wingRight/body |
| `metadata` | 固定の識別子、全長目安、座標基準など |

## フェーズ

- `idle`：待機、頸椎と尾の微動、翼の低速呼吸
- `roar`：顎開放、翼の威嚇展開、頭部後傾
- `charge`：炉心加速、顎開き、口元エネルギー球
- `breath`：光線エフェクト（**視覚演出のみ**）
- `flight`：翼の羽ばたき、脚の飛行姿勢、胴体の上下動
- `land`：地上への復帰用の中立姿勢

`update(dt,{phase:'charge'})` のように毎フレーム指定可能です。フェーズが変わると内蔵フェーズ時間がリセットされます。再度の同フェーズ開始を明示する場合は `setPhase('idle')` → `setPhase('charge')` と切り替えてください。

## 統合上の設計方針

- モジュール内では **WebGLRenderer、Camera、Scene、コントローラーを生成しません**。
- モジュール内では `window`、`document`、イベントリスナー、ゲーム状態にアクセスしません。
- ダメージ、AI、当たり判定、衝突、UI、戦闘バランス、ステージギミックは含まれません。
- `root` は原点周辺に配置し、竜の前方は -Zです。足先付近がY=0になるスケールです。
- 足、頭、翼、尾はグループで独立可動。全体の移動と当たり判定は統合側が管理できます。
- 召喚時や距離に応じて `setQuality('low')` を呼べます。軽量化のため物理演算やスキニングは使用していません。
- 複数インスタンスは制作可能ですが大型ボスのため同時多数配置は非推奨です。
- インスタンスごとにGeometry/Materialを所有し、`dispose()` で解放できます。

## 高品質・軽量版

本編側の描画解像度やシャドウ設定は統合担当No.00が管理します。No.13は描画品質のクラス選択を提供するのみです。50fps以上の達成には本編全体の描画負荷を含めたiPhone 16 Safari実機計測が必要です。
