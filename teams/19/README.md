# AETHER FRONTIER | No.19 プレイヤー操作システム

Three.js **0.160.0** / build不要 / PC keyboard+mouse・iPhone Safari touch

## ファイル

- `index.html`: Cloudflare Pages直接アップロード用。HTMLだけでデモ全体を実装（ただしThree.js 0.160.0だけは固定CDNから読み込むためネット接続が必要）。
- `AETHER_FRONTIER_No19_Demo.html`: `index.html` と同じ単一HTMLデモの別名コピー。
- `src/aether-player-controller.js`: 本編に組み込むプレイヤー制御。依存注入型、カメラ/renderer/sceneの生成なし。
- `src/aether-input-adapter.js`: 任意で使えるPC + タッチ入力アダプター。外部独自入力への差し替え可能。
- `demo-src/main.js`: 体験デモの分離版ソース。
- `developer-demo.html`: 変更検証向けのソース分離デモ。Cloudflare Pagesならそのまま開ける。
- `tests/test-controller.mjs`: Node.jsで動く数学/イベントの基本テスト（WebGL不要）。

## デモの遊び方

PC: WASD / 矢印で移動、Shiftで走る、Spaceでジャンプ、マウスで視点、Qで短距離ダッシュ、EまたはFで調べる、VまたはCでFPS/TPSを切り替え。ゲーム画面をクリックするとポインターロック、Escで解除。ロックできない環境ではドラッグでも視点操作。

iPhone: 左仮想スティックで移動、画面右の空き領域をスワイプで視点変更。「走る」（押している間）「ジャンプ」「ダッシュ」「調べる」「視点」ボタンを使用。アドレスバーの外の画面内で操作。

デモでは4つのエーテル端末を起動すると探索完了。右上で軽量版/高品質版を切り替えられる。起動後のモードは最初軽量版。

## 統合API

```js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { createAetherModule } from './src/aether-player-controller.js';
import { createAetherInputAdapter } from './src/aether-input-adapter.js';

// 既存ゲームがscene / camera / renderer / canvasを作成済みとする。
const controls = createAetherInputAdapter({ domElement: renderer.domElement });
const player = createAetherModule(THREE, {
  scene,                       // 指定するとrootをsceneへ自動追加（解除可）
  camera,                      // 外部カメラ
  avatar: myCharacterGroup,    // 任意。FPSでは非表示、TPSでは表示
  position: { x:0, y:0, z:0 },
  getGroundHeight(x,z) { return 0; },
  resolveMovement({ previous, proposed, radius, height, dt, velocity }) {
    // 独自物理エンジンの衝突判定や地形補正に差し替え
    return proposed;
  },
  cameraObstruction({ origin, target, distance }) {
    // TPSカメラと障害物の交差距離。数値で返す。
    return distance;
  },
  onEvent(event, api) {
    if(event.type === 'action') handleInteract(api.getPosition());
    if(event.type === 'dash') onDashFx();
    if(event.type === 'jump') onJumpFx();
    // mode, land, quality, teleport も通知
  },
});

// ゲーム側の共通ループで、1回/フレーム：
const dt = clock.getDelta();
const playerState = player.update(dt, { input:controls });
renderer.render(scene,camera);

// 画質管理チームからの切替通知を受ける：
player.setQuality('low'); // または 'high'
// 乗り物への乗車中は本体の移動/視点更新を停止できる：
player.setEnabled(false);
// 降車後復帰：
player.teleport(x,y,z,vehicleExitYaw);
player.setEnabled(true);

// 破棄時：
controls.dispose();
player.dispose();
```

### `createAetherModule(THREE, options)` 戻り値

必須: `root`、`update(dt, context)`、`setQuality(mode)`、`dispose()`。

追加: `setMode('fps'|'tps')`、`getMode()`、`setCamera(camera)`、`setAvatar(group)`、`setInputSource(input)`、`setEnabled(boolean)`、`teleport(x,y,z,yaw)`、`getPosition()`、`getState()`、`on(callback)`。

`scene` を指定すると `root` を自動追加。独自管理したい場合は `attachToScene:false` を指定して、自分で `scene.add(player.root)` を呼ぶ。`dispose()` は外部シーン・モデルのジオメトリ/マテリアル/rendererを破棄しない。

### 入力の契約

`update(dt, {input})` の `input` は値オブジェクト、`sample()` メソッドを持つアダプター、または入力値を返す関数。

```js
{
  moveX: 0,             // -1 = 左, +1 = 右
  moveY: 1,             // +1 = 前方(-Z), -1 = 後方
  lookX: 0.015,         // 1フレームでのヨー角変化 [rad]
  lookY: -0.005,        // 1フレームでの視線の下向き変化 [rad]
  jump: false,          // 押している間 true
  sprint: false,
  dash: false,
  action: false,
  toggleView: false,
}
```

`jump`、`dash`、`action`、`toggleView` は**押し始めの瞬間**に一度起動する。`jump` は入力猶予(140ms) + コヨーテタイム(115ms)、可変ジャンプ高。`dash` はクールダウン付き。走行/加速/空中制御/カメラ平滑化はフレーム依存を減らす指数応答。物理演算は最大90Hz程度で分割し、フレーム時間を最大66.7msに制限。

### `update` の `context`

各フレームの `context` で `camera`、`input`、`getGroundHeight`、`resolveMovement`、`cameraObstruction` を上書き可能。`resolveMovement` コールバックは衝突解決済みの `{x,y,z}` または `{position:{x,y,z},velocity?,grounded?}` を返す。`getGroundHeight` は指定座標における足元Y、地面がなければ `-Infinity`。TPSカメラの障害物コールバックは `{origin,target,distance}` を受け、許容する距離（m。1以下の戻り値は距離比と解釈）を返す。

**座標規約**: +Y上、カメラおよびキャラクター初期前方-Z、1unit≒1m。`root.position` は足元。

## パフォーマンス・品質

- 主な物理処理はGPUから独立しており、モデルやレンダラーを専有しない。
- デモの軽量版ではDPR上限1.16、星粒子数190。高品質版ではDPR上限1.85、星粒子数600。iPhone実機によるフレームレート合否は未検証。
- `setQuality` は入力やゲームバランスを変更せず、TPSカメラ障害物問い合わせ頻度を切り替える。レンダラー側の画質はNo.17側で一元管理を想定。
- デモの当たり判定は単純な軸平行Boxと水平床。正式なステージでは床高判定、斜面、段差、動的オブジェクト、壁すり抜け対策を専用衝突処理で差し替える。

## ビルド・公開方法

Cloudflare Pagesの **Direct Upload** に `index.html` を含むZIPをドラッグアンドドロップ。`wrangler` も `npm install` もビルド設定も不要。CDNにネット接続できれば表示できる。

## テスト

`node --check` で全JavaScriptの構文を確認済み。`node tests/test-controller.mjs` で方向移動、ジャンプ、FPS/TPS切替、入力エッジ検出、ダッシュクールダウンなどのロジックを確認済み。

ブラウザ表示やiPhone 16 Safariの実機操作・FPS実測は未実施。ゲーム本編統合時に実機検証が必要。
