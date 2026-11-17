# No.13 RIFT-CROWN｜No.00 統合仕様書

## 前提条件

- Three.js **0.160.0**、Y軸上、機首前方 -Z、1単位約1m。
- オリジナル `createAetherModule(THREE, options)`、騎乗拡張 `createAetherRidingModule(THREE, dragon, options)` を利用。
- `createVhalkorVisualUpgrade(THREE, dragon, options)` は**装飾専用拡張**。移動やカメラ、戦闘ロジックを管理せず、ゲーム既存シーンやrendererを書き換えない。
- ボスとして使うときは visual のみを追加してもよい。騎乗解放後に ride を作る構成も可能。

## 初期化例

```js
import { createAetherModule } from './src/aether-dragon.js';
import { createAetherRidingModule } from './src/aether-riding.js';
import { createVhalkorVisualUpgrade } from './src/aether-visual-upgrade.js';

const dragon = createAetherModule(THREE, { quality: 'low' });
scene.add(dragon.root);

const ride = createAetherRidingModule(THREE, dragon, {
  quality: 'low',
  unlocked: false,            // ボス撃破後に ride.unlock() を実行する
  showPreviewRider: false,   // 本編キャラクターを別途プレイヤー側で表示
  groundHeight: (x, z) => getTerrainHeight(x, z),
  maxAltitude: 300,
});

const visual = createVhalkorVisualUpgrade(THREE, dragon, {quality:'low'});

// ボス撃破時
ride.unlock();
// プレイヤーが近接操作した際
ride.mount();
// 騎乗完了イベントを受けて ride.takeoff() を許可
ride.onEvent(event => console.log(event.type));

// 毎フレーム、二重に dragon.update() を呼ばないこと。
function update(dt, playerInput){
  ride.setInput({
    forward: playerInput.forward, // -1..1
    turn: playerInput.turn,       // -1..1
    climb: playerInput.climb,     // -1..1
    pitch: playerInput.pitch,     // -1..1
    boost: playerInput.boost,     // boolean
  });
  ride.update(dt);
  visual.update(dt,{riderState:ride.getState(),boost:playerInput.boost});

  // プレイヤーの外観・位置を管理している本編に任せる
  // const {position, quaternion} = ride.getRiderWorldPose();
}

function setQuality(mode){
  ride.setQuality(mode);
  visual.setQuality(mode);
}
function dispose(){
  visual.dispose();  // 追加外装のみ撤去
  ride.dispose();    // 騎乗拡張のみ撤去
  dragon.dispose();  // 最後に旧本体を破棄
}
```

## 新外装API

| API | 意味 |
| --- | --- |
| `createVhalkorVisualUpgrade(THREE, dragon, options)` | 元モデルが生成済みの状態で追加外装を生成 |
| `visual.root` | 既存 `dragon.root` を返す。新しいシーン管理は不要 |
| `visual.update(dt, { riderState, boost })` | 翼端、エネルギー炉心、飛行噴流を更新 |
| `visual.setQuality('low'|'high')` | 追加外装の精細度を切り替える（元モデルには干渉しない） |
| `visual.dispose()` | 追加したGroup、ジオメトリ、マテリアルを解放 |
| `visual.metadata` | バージョン／対応モデルID／座標系 |

`riderState` は `ride.getState()` の戻り値。`visual` はボス専用使用時でも `visual.update(dt)` だけで演出できる。

## 元の機能との関係

- 元メッシュ、旧 `dragon.setPhase('roar'|'charge'|'breath'|'idle'|'flight'|'land')`、`dragon.update`、`dragon.setQuality`、`dragon.dispose` はコード不変更。
- 独立外装は元 `head`、`MotorJaw`、`body`、`core.parent`、左右翼、9つの尾関節の子Groupとして付属する。元の各部のアニメーションに追従。
- 騎乗位置・操作受付など既存の乗降APIは維持。
- 高速飛行のエネルギー噴流は**視覚専用**。衝突判定・攻撃判定・ダメージに影響を与えない。
- 骨格表現、プレイヤーキャラのアバター移動、衝突・地面判定、騎乗解放フラグの永続保存は本編側で扱う。

## デモ専用項目

`src/riding-demo.js` は見せるためのミニ世界、HUD、キーボードとタッチ操作、追従カメラ、演出切替を実装。統合時に読み込む必要はない。

## 注意点

- 元本体には既に400以上のメッシュがあるため、大量のボス同時出現には別途メッシュ結合/LOD化が必要。
- 追加外装155メッシュ（HIGH構造上）、軽量時は一部を非表示にする。**iPhone実機FPS測定なし**。
- 静的HTMLは Three.js の外部CDNが読み込める環境で動作する。ビルド工程は不要。
- GitHub/既存mainのファイルはこの成果物の生成中に更新・コミットしていない。
