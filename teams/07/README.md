# AETHER FRONTIER / No.07 「星脈の大地」

## 納品物
- `AETHER_FRONTIER_No07_Standalone.html`：プレイ用の単体HTML。地形・景観・操作系・UIのコードを1ファイルに収録。Three.js r160だけCDNから読み込む。
- `index.html`：Cloudflare Pages直接アップロード用の入口。
- `aether-nature.js`：**統合用モジュール本体**（カメラ・レンダラー・プレイヤー操作と独立）。
- `demo.js`：単体デモ専用のプレイヤー操作、仮設偵察グライダー、HUD、セーブ、カメラ。

`index.html` / `demo.js` / `aether-nature.js` を同じ階層にしてCloudflare Pagesに直接アップロードする。ビルド・npm・wrangler不要。`Standalone.html`を`index.html`という名前に変更して、それだけアップロードする方法も使える（ソースZIP側の`index.html`とは別物）。

**通信**：Three.js 0.160.0のES Moduleを `https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js` から読み込む。その他の画像・3Dモデル・音声は外部依存なし。CDNへのネット接続が必要。

## ゲームの内容

地表に広がる約720 m × 720 mの手続き生成フィールド。鏡湖、原生林の巨大樹、架橋された断層峡谷、露出結晶群、星痕観測塔、中央の古代石環、地平線の山並みを探索できる。五つの記憶装置を見つけて起動し、最後に古代石環の門を再起動させる探索ミッションを搭載。

**PC操作**
- `WASD` 移動 / マウス 視点操作（画面クリックでロック、ESCで解除）
- `Shift` ダッシュ / 飛行加速
- `Space` ジャンプ / 飛行時は上昇
- `C` または `Ctrl` 飛行時に下降
- `F` 徒歩・飛行の切り替え
- `E` 付近の装置を調べる
- `V` TPS・FPS切り替え
- `M` 探索図（目的地選択）

**タッチ操作**
- 左下ジョイスティックで移動、右側の空き領域をスワイプして視点回転。
- 右下ボタンでジャンプ、飛行、上昇、下降、調べる、視点切り替え。
- 右上で品質モードと探索図切り替え。
- スマホの「飛行艇」は探索デモ専用の**簡易偵察グライダー**。本編統合ではNo.08制作の飛行艇を利用する想定。

## 統合API

```js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { createAetherModule } from './aether-nature.js';

const nature = createAetherModule(THREE, {
  quality: 'low', // 'low' | 'high'
  seed: 73017     // 任意。景観位置のランダム要素用
});
scene.add(nature.root);

// animation loop
nature.update(deltaSeconds, { playerPosition: localPlayerPosition });

// collision: ground height (x,z are module-local metres)
const groundY = nature.getWalkHeight(localX,localZ);
const terrainY = nature.getHeightAt(localX,localZ);

// Interactions. Player height matters. Usually call when user presses E/taps.
const near = nature.getNearby(localPlayerPosition, 12);
const result = nature.interact(localPlayerPosition);

// Optional exploration progress persistence
const save = nature.getState();
nature.loadState(save);

nature.setQuality('high');

// teardown
nature.dispose();
```

### 公開インターフェース

| property / method | meaning |
| --- | --- |
| `root` | `THREE.Group`。シーンに追加する。描画カメラ・レンダラーに非依存。 |
| `update(dt, context)` | アニメ更新。秒単位のdt。contextは任意（`playerPosition`, `onDiscovery`）。 |
| `setQuality('low'/'high')` | 地形解像度・樹木・岩・光粒密度を切り替える。 |
| `dispose()` | rootのシーンからの切り離しとGPU資源解放。 |
| `terrainHeight(x,z)` / `getHeightAt(x,z)` | 元の地表高度。 |
| `surfaceHeight(x,z)` / `getWalkHeight(x,z)` | プレイヤー向け歩行面高度（湖・橋の表面を含む）。 |
| `getNearby(position,radius=12)` | 付近の装置の状態・名称・距離。高さ11m以内も判定。 |
| `interact(position)` | 付近の装置を起動。成功・失敗の理由と進行度を返す。 |
| `getState()` / `loadState(state)` | 回収済み記憶・門の状態を保存/復元。 |
| `markers` | 6カ所のマーカー `{id,name,x,y,z,final}` の配列。 |
| `bounds` | ローカル座標の探索範囲。 |
| `metadata` | 規格/エリア情報・推奨出現地点。 |

## 技術規格・統合時の注意
- Three.js **0.160.0** / Y up / forward -Z / 1ユニット約1m。
- root.positionによるマップ内配置は可能。ただし公開高さ取得・マーカー・インタラクトAPIは**モジュールローカル座標**。統合側が位置変換する。
- カメラ、レンダラー、ライティング、プレイヤー、入力、HUD、セーブ先、ミッション管理はモジュール本体に含めず外部側に委ねる。
- 地形高度・湖・橋を参照する歩行判定を提供。細かい木や遺構の側面衝突は未実装のため、必要なら統合側で追加する。
- 景観自体はデモのライティングのもとで見える。統合シーン側でもHemisphereLight/DirectionalLight等を供給すること。
- 門を起動するまで記憶回収順は自由。回収済みであることを表す状態はモジュール内に保持し、単体デモだけがlocalStorageに保存する。
- グライダー、カメラ、HUD、操作、簡易FPS表示は `demo.js` にのみ存在し、統合用モジュールには含まれない。

## 品質設計と検証ステータス
- `low`：地形124×124分割、植生・岩・粒子数を制限（樹木候補1300、草3200）。`high`：224×224分割、植生・岩・粒子を増加（樹木候補3100、草10500）。InstancedMeshを使って植生の描画呼び出し数を削減。
- Mobileでは低解像度レンダリングをデフォルトにして、画面操作をタッチ対応化。高品質モードは明示的な切り替えに対応。
- ポストプロセスや巨大画像テクスチャ、追加アセットは使用しない。
- ソースのJS構文検査、ZIP整合性、HTML内要素参照検査を実施。**PC実ブラウザでの描画・iPhone 16 Safariでの実機fps測定は未実施**。50/60fpsはプロジェクトの目標値であって実測値ではない。
