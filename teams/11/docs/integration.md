# No.11 統合API

**基本仕様:** Three.js 0.160.0、右手座標系、Y軸上、**ローカル前方-Z**、1単位≒1m。

`src/aether-drone.js` には `THREE` のグローバル参照、レンダラー、カメラ、HTML、ゲーム内入力処理、勝敗ロジック、衝突判定、AI戦闘ロジックは含まない。各管理システムは別チームへ委任する。

## 最小コード

```js
import { createAetherModule } from './src/aether-drone.js';

// `THREE` はゲーム本編が共有管理するThree.js 0.160.0オブジェクト。
const drone = createAetherModule(THREE, { quality: 'low', mode: 'friendly' });
scene.add(drone.root);
drone.root.position.set(10, 3, -14); // ワールド座標: 移動は外部制御

function gameUpdate(dt, worldVelocity) {
  drone.update(dt, {
    velocity: worldVelocity,       // {x,y,z}。機体の軽いロール演出に使用
    flying: true,                 // falseで浮遊の上下揺れ停止
    targetLocal: {x:0.1, y:0.0}, // 眼球追従。ローカル座標として扱う
  });
}

// 状態を切り替えると、発光と翼展開が緩やかに連動する
// drone.setMode('neutral' | 'friendly' | 'hostile')
// drone.setQuality('low' | 'high')
// drone.setDeployment(0.0～1.0 または null) // null で自動変形に戻す
// drone.triggerScan()
// drone.getState() // 現在状態のスナップショット

// エリア退場時
scene.remove(drone.root);
drone.dispose();
```

## API 一覧

| メソッド／プロパティ | 役割 |
|---|---|
| `root: THREE.Group` | ゲーム側がワールド位置・姿勢を決める公開ルート。モジュール内では位置回転を変更しない。 |
| `update(dt, context = {})` | 毎フレームのアニメーション更新。`dt`は秒、0〜0.1へclamp。 |
| `setQuality('low' / 'high')` | 省略可能なルーン、光源、装飾、詳細パーツを表示/非表示。 |
| `setMode('friendly' / 'neutral' / 'hostile')` | 青緑 / 琥珀 / 紅の結晶発光と自動翼展開率を変更。 |
| `setDeployment(0..1 / null)` | 外部から変形率を上書き。`null`でモード連動に戻す。 |
| `triggerScan()` | ダメージを持たない魔力探査演出を1回再生。 |
| `getState()` | `{ mode, quality, deployment, scanActive, elapsed, disposed }`。 |
| `dispose()` | 生成したジオメトリ・マテリアルを一度だけ解放。ルートを親から外す。 |

**`context`のフィールド**

| フィールド | 型 | 役割 |
|---|---|---|
| `mode` | string | 省略可能。`setMode()`同様に切替。 |
| `velocity` | `{x,y,z}` | 省略可能。機体内部の反動/姿勢演出にだけ使用。rootの位置を動かさない。 |
| `flying` | boolean | `false`で浮遊する上下揺れを止める。 |
| `targetLocal` | `{x,y}` | 省略可能。局所的な追尾視線方向のヒント。視線の振れ幅は自動で制限。 |
| `deployment` | number または `null` | 省略可能。存在すれば変形率を設定。 |
| `scan` | boolean | falseからtrueの立ち上がりに1回スキャンを開始。 |
| `timeScale` | number | 機体内部のアニメ速度倍率。0.05〜3.0。 |

**注意:** 描画品質モードで切り替えるのは「モデル内部」だけ。レンダラーの内部解像度やシャドウ設定をゲーム側で制御すること。デモは独立して描画解像度も切り替える。

## 別体の飛行制御

`src/drone-pilot.js`はオプション。必要なゲームにのみ利用する。

```js
import { createDronePilot } from './src/drone-pilot.js';

const drone = createAetherModule(THREE, { quality:'low' });
scene.add(drone.root);

const pilot = createDronePilot(THREE, {
  root: drone.root,
  center: [0, 2, 0],
  autopilot: true,
  horizontalLimit: 5
});

function tick(dt) {
  const state = pilot.update(dt); // 外部入力なしなら巡航
  drone.update(dt, { velocity:state.velocity });
}

pilot.setAutopilot(false);
// 外部の手動入力を与えるとき
const state = pilot.update(1 / 60, {
  x: 0, y: 0, z: -1, boost: false, cameraYaw: 0
});

drone.dispose();
pilot.dispose();
```

本編に独自移動システムがある場合はpilotは使用しない。飛行制御と見た目のモジュールは一切結合していない。

## 統合上の注意

- `update()`中は `root.position` や `root.rotation` を変更しない。浮遊揺れ・翼の展開・見回しなどは**子Groupだけ**を更新する。
- ワールドの移動やターゲット選定、ロックオン/戦闘処理、ゲームの状態管理は本編側で実装する。
- `dispose()`後はそのインスタンスを再利用せず、必要なら `createAetherModule()` を再度呼ぶ。
- 実機の描画負荷は他チームのステージ/光源と合算されるので、統合後に品質別のパフォーマンステストが必要。
- 複数体を配置したい場合は `createAetherModule()` を別々に呼ぶ。内部マテリアルを個体ごとに作るため、色や変形が個別制御できる。
- 色や構造はゲームプレイでの敵味方判定と独立させ、ゲームロジックから`setMode()`を呼ぶ。
