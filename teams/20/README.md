# AETHER FRONTIER / Team No.20

## MERIDIAN VAULT　「星環の封印」

Three.js 0.160.0 / プレイヤー操作式探索ギミック / 純粋なES module / ビルド不要

### 納品内容

- `index.html`：Cloudflare Pagesにそのまま置ける実行デモ（HTML一枚。Three.jsのCDN読み込みのみ必要）
- `AETHER_No20_MeridianVault_STANDALONE.html`：上と同じ単一ファイルデモ
- `source/aether-interactions.js`：**統合用独立モジュール本体**
- `source/integration-example.js`：本編への接続例
- `demo/index.html`：ソース分離版デモ（`../source/aether-interactions.js`を読み込む）
- `demo/demo-app.js`：操作系とテスト用探索キャラクター
- `demo/template.html`、`build.py`：任意の再パッケージ用。実行・公開時には不要
- `tests/smoke.mjs`：状態遷移を対象にしたNode.jsモックテスト

### 仕掛け（遊び方）

1. 蒼天・黄昏・星影、計3基の位相盤を1ステップ60度ずつ回す。各位相盤の指針を金色の目盛りに重ねると、中央装置へ光路がつながる。
2. 星核保管台で動力結晶を回収し、六葉封印門の手前にある中枢スロットへ搬入する。順序は自由。
3. 3基の位相一致と星核接続がそろうと、封印門のロックが解除され、6枚の扉が開く。解除は再起動まで維持される。
4. 扉の向こうにある星環ゲートを起動して離れた展望台へワープ。帰還ゲートから戻ることもできる。
5. 広場の古代端末でヒントを読み、展望台の再起動装置で最初から遊び直せる。

### 単体デモ操作

| 機能 | PC | タッチ（iPhone Safariなど） |
|---|---|---|
| 移動 | WASD / 矢印キー | 左スティック |
| 視点 | マウス、クリックでポインターロック | 画面右側をスワイプ |
| 操作 | E / F | 「調べる」 |
| ダッシュ | Shift | RUN（オン / オフ） |
| ジャンプ | Space | JUMP |
| FPS / TPS | V または画面右上 | 画面右上 CAMERA |
| 軽量 / 高品質 | Q または画面右上 | 画面右上 GRAPHICS |

### 基本API

```js
import { createAetherModule } from './source/aether-interactions.js';

const mod = createAetherModule(THREE, {
  quality: 'low',               // 'low' | 'high'
  includeStage: true,           // 床などの独立デモ用背景を含めるか
  includeLights: false,         // 本編の光源を優先する場合false
  onEvent: event => console.log(event),
  onTeleport: event => { /* event.positionはワールド座標。ホスト側で移動 */ }
});
scene.add(mod.root);

// 毎フレームのゲームループから呼ぶ。モジュールは描画しない。
mod.update(dt, { playerPosition: player.position });

// プレイヤーが操作キーを押す直前に、視点前方の対象を取得。
const aim = camera.getWorldDirection(new THREE.Vector3());
const focus = mod.findInteractable({
  origin: camera.getWorldPosition(new THREE.Vector3()),
  direction: aim,
  playerPosition: player.position,
  maxPlayerDistance: 4.3,
});
if (focus) {
  const result = mod.interact(focus.id, {
    playerPosition: player.position,
    requireRange: true,
  });
  if (result.type === 'teleport') player.position.set(
    result.position.x, result.position.y, result.position.z
  );
}

// 保存・復元
const save = JSON.stringify(mod.getState());
mod.setState(JSON.parse(save));

// 画質変更・破棄
mod.setQuality('high');
mod.dispose();
```

### 外部向けメソッド

`root`、`update(dt, context)`、`setQuality(mode)`、`dispose()` の必須4種に加えて：

- `findInteractable({origin, direction, playerPosition, maxDistance?, maxPlayerDistance?})`：ワールド座標の照準判定。`{id,label,hint,distance,position,available}` または `null` を返す。
- `getInteractables()`：全操作対象の情報（座標はワールド）。外部UIや近接判定に使用可能。
- `interact(id, {playerPosition?, requireRange?})`：指定ギミックを操作。結果オブジェクトとイベントを返す。`requireRange:true` ならプレイヤーからの距離も検査。
- `getState()` / `setState(obj)`：JSON互換の保存・復元（`version:1`）。不正値は補正される。
- `getProgress()`：共鳴数、星核状態、封印解除、扉の開度、転送回数。
- `getColliders()`：ホスト用の簡単な静的衝突ボリューム情報。**モジュールローカル座標**。開いた扉は除外される。
- `isWalkable(x, z)` / `isPassageClear(x,z,nx,nz)`：単体デモ用のローカル座標歩行ガイド。ホストが独自物理を持つなら使用不要。
- `reset()` / `consumeEvents()` / `getQuality()` / `getSpawn()` / `getBounds()`。

イベント例：`relay_rotated`、`core_picked_up`、`core_inserted`、`vault_unlocked`、`teleport`、`archive_read`、`reset`。転送位置は**ワールド座標**、`localPosition` も併記。モジュール自身はプレイヤーを移動させない。

### 共通技術条件

- Three.js 0.160.0 / Y軸上 / 前方 -Z / 1ユニット約1m。
- `root` を外部で配置・回転できる。デモ操作と本編のギミック制御を分離。
- 建造物・装置はジオメトリ生成型で画像・GLB等の依存なし。
- Canvas、`window`、レンダラー、カメラ、DOM、キーハンドラは**統合用モジュールには存在しない**。
- 画質低で追加の光・粒子・遠景装飾・グローを抑制。高画質で装飾やパーティクルを有効化。
- 追加ライブラリ・ビルド・wrangler構成ファイルは不要。ただしWebGLとThree.js CDNへのネットワーク接続が必要。

### デプロイ（Cloudflare Pages）

ZIPを展開またはそのままCloudflare Pagesの直接アップロードに指定し、**最上位の `index.html` が公開ルートに配置される構成**にする。`wrangler.toml` などは含まない。ビルド設定は不要。

### テスト状況

- `node tests/smoke.mjs`：パス（位相器3基、星核、封印解除、扉衝突、転送、状態保存復元、画質、破棄など）。
- `node --check`：モジュールとデモJSに構文エラーなし。
- ChromiumでのWebGL表示試験は実施できず（検証環境がローカルHTTPとCDNにアクセス不能）。iPhone 16 Safariの実機fpsや60/50fps達成は**未測定**。公開後に実機で計測・評価が必要。

### 性能・統合の注意

プレビュー内の床・照明・プレイヤーは、本編への取り込み時に必要に応じて切り離せる。`includeStage:false,includeLights:false` ならギミックのみを追加できる（ただし本モジュール内の装飾の一部は残る）。自前の衝突処理やアニメーションループを持つゲームでは、デモ用 `demo-app.js` を流用せず、`source/aether-interactions.js` のみを使用すること。
