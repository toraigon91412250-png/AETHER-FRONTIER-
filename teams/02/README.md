# AETHER FRONTIER | Team No.02 | LUMEN QUARTER

**担当:** 中央都市の商業・居住地区（中央タワーは含まない）  
**技術:** Three.js 0.160.0 / WebGL / JavaScript ES Modules / Y上 / 前方 -Z / 1単位≒1m  
**版:** 1.0.0（2026-11-08）

## 配布ファイル

- `index.html`: **デモ単体HTML**。HTML内にモデルコードとデモ実装を内蔵。外部リソースは Three.js 0.160.0 の CDN のみ（通信必須）。Cloudflare Pages に直接アップロード可。ビルド不要。
- `src/aether-district.js`: **統合専用の独立モジュール**。`createAetherModule(THREE, options)`を ES module として export。`window.createAetherModule` にも公開。
- `src/demo-runtime.js`: デモ用カメラ、FPS/TPS、簡易移動、衝突処理、キーボード、タッチUI。統合時には不要。
- `README.md`: 本書。

## デモ操作

| 操作 | PC | iPhone / タッチ | 
|---|---|---|
| 移動 | W A S D | 画面左下の仮想スティック |
| 視点 | マウス（クリックでロック）| 画面右側をスワイプ |
| ジャンプ | Space | ジャンプ |
| 走る | Shift | 走る（長押し）|
| 装置の操作 | E / F | 操作 |
| FPS / TPS | V | 画面右上「FPS/TPS」|
| 画質 | Q | 画面右上「高品質/軽量」|
| マウス解除 | Esc | 該当なし |

中央大通り（X=0）から、**西（X＜0）が商業街、東（X＞0）が居住街**。北側（-Z）が中央都市につながる想定。開始地点は `(0, 0.32, 66)`。

### 探索スポット

1. 西側の `AETHER SUPPLY`：店内に入って結晶を共鳴させる。
2. `ORBIT CAFE`：店内の照明切替。
3. `NOVA FORGE`：製作台がある修理工房。
4. 市場広場：複数の屋台と案内板。
5. 東側 `VESPER COURT`：集合住宅内、メールボックス、庭。
6. **X=19.6、Z=20.1 のガラス昇降リフト**：屋上まで運ぶ。
7. **屋上テラス → 長いスカイウォーク → SKY NEST 屋上**：菜園と星見台の装置。

## 統合 API

```js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { createAetherModule } from './src/aether-district.js';

const district = createAetherModule(THREE, {
  quality: 'low',
  origin: {x: 240, y: 0, z: 0},  // No.01との重複を避けて自由に配置
});
scene.add(district.root);

// ゲームの既存ループ内:
district.update(deltaSeconds, {
  playerPosition: player.position, // 省略可能
});

// 設定変更:
district.setQuality('high'); // 'low' または 'high'

// 当たり判定・移動処理（コントローラーは統合側で実装）:
const before = {x:player.x,y:player.foot,z:player.z};
const proposed = {x:before.x + dx,y:before.y,z:before.z + dz};
const safe = district.resolveMovement(before, proposed, 0.34, 1.70);
const floorY = district.getGroundHeight(safe.x, safe.z, player.foot);

// 近くのギミック:
const near = district.getNearestInteraction({x:player.x,y:player.foot,z:player.z}, 3.6);
if (near && playerPressedAction) {
  const feedback = district.interact(near.id);
  console.log(feedback.message);
}

// シーン解放時:
district.dispose();
scene.remove(district.root);
```

### 返却オブジェクト

- `root`: `THREE.Group`。外部カメラ、レンダラー、シーンを要求しない。原点位置は `options.origin`（省略時 0）。
- `update(dt, context)`: 毎フレーム。dt は**秒**。context は任意。
- `setQuality(mode)`: `'low'` または `'high'`。追加造形をオン・オフ。
- `dispose()`: ジオメトリ、テクスチャ、マテリアルのリソース解放。
- `getNearestInteraction(worldPosition, range=3.4)`: 近くの装置情報。
- `getInteractions()`: 操作スポットの一覧（ワールド座標）。
- `interact(id, context?)`: 仕掛け操作とイベント結果。文字列の `id` で識別。
- `getGroundHeight(worldX, worldZ, footY)`: **ワールド座標**の足元高さ。屋上やリフトを認識し、入力 footY が下層にある時に上層へワープさせない。
- `resolveMovement(from, to, radius=0.34, height=1.70)`: **ワールド座標**の AABB 簡易衝突回避・壁沿い移動。返却値は `{x,y,z}`。※大規模ワールド用の物理エンジンではない。
- `getLiftState()`: ローカルリフト高さ、目的地、最大高さ。
- `spawn`: 初期位置（ワールド座標）。
- `bounds`: 街区ワールド座標 X,Z 範囲。
- `metadata`, `getStatistics()`: 属性やモデル情報。

**他チームとの連携:** 原点は `options.origin` で設定。ワールド座標を使う移動APIは配置位置を反映。独自カメラ、描画ループ、描画コンテキスト、入力バインド、ライト、フォグ、ポストエフェクトを統合側へ強制しない。現行ソースでは物理オブジェクトの移動、重力、クリックUIなどはデモ側が担当する。シーンの他要素と共有する当たり判定の合成もNo.00が調整する。

## 品質と軽量化

- 主要造形・窓・街路樹・装飾を `InstancedMesh` でまとめる。静的オブジェクト 2,000超を比較的少ないメッシュに集約。
- `low`: 主要建築と街路、小物、ショップ内部、リフト、空中回廊は維持。追加装飾とドローンの回転演出などを削減。
- `high`: 詳細な窓の縁・看板周辺装飾・手すり・植物などを追加。
- 描画は1シーン、シャドウマップと重いポストエフェクトなし、タッチ端末の解像度倍率に上限。
- デモでは低FPSが続くと描画解像度を段階的に下げるベストエフォート機構を搭載。
- 建物はプリミティブジオメトリ中心、モデルテクスチャの追加通信なし。看板文字のみ実行時にCanvasTexture生成。

**注意:** iPhone 16 実機・Safari上でのfps測定は未実施。軽量版50fps以上、高品質版50fpsの達成は目標であり、実測保証ではない。GPU/ブラウザ/統合先の負荷によって変化するため、No.00の実機統合テストで評価が必要。

## Cloudflare Pages への直接アップロード

1. ZIPを解凍してフォルダ内の `index.html` を選ぶか、`index.html` のみをアップロードする。
2. `index.html` は Three.js をネットのCDNから読んで実行する。Cloudflare Pages側にビルド設定、wranglerファイル、npm依存は不要。
3. 完成物はそのままSafariで開ける。アップロード後にオンライン状態で検証。

## 実装上の制約

- 本体には操作を表示する独自HUDやカメラは含めず、ホストが使えるAPIだけを提供。
- 建物の衝突はAABB近似。屋内設備が一部すり抜けられる場合があり、複雑な形状の完全物理判定ではない。
- マップ外はインビジブル境界で移動を制限する（デモ）。統合時に範囲を変更する場合はナビゲーション実装側の調整が必要。
- `index.html` はライブラリを除いて完全埋め込み、`src/aether-district.js`は統合先から相対importする。両者は同一のモジュールソースを使用。
