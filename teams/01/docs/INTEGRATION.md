# Team 01 統合仕様 / No.00向け

## API

```js
import { createAetherModule } from './src/aether-module.js';
// THREEはホストが使用中の Three.js 0.160.0 の名前空間を渡す。
const area = createAetherModule(THREE, { quality: 'lite', seed: 1001 });
scene.add(area.root);

// アニメーションループ（dtは「秒」単位）
area.update(deltaSeconds, {
  playerPosition: { x: player.x, y: player.y, z: player.z }
});

// 設定の切り替え（戻り値は 'lite' or 'high'）
area.setQuality('high');

// 必要なくなったら破棄
area.dispose();
```

必須戻り値は `root: THREE.Group`、`update(dt,context)`、`setQuality(mode)`、`dispose()`。以下は操作デモや統合ナビゲーション用の追加API。

| 関数 | 説明 |
|---|---|
| `getFloorHeight(x,z,currentY)` | 足元の床高さ（ローカル座標）。通常0.42m、内側広場0.68m、展望環64.16mなど。 |
| `resolveHorizontal(x,z,previousX,previousZ,currentY)` | 塔本体、4パビリオンの祭壇、展望環外周、都市外縁への侵入を抑制。`{x,z}`を返す。簡易円形コリジョン。 |
| `getNearbyInteraction(position, range=5)` | 最寄りの碑・転移台・記録の情報。位置はプレイヤーの**足元**のローカル `{x,y,z}`。 |
| `interact(id)` | 操作。`{ok,type,message,changed?,activated?,warpTo?}`。`warpTo`があればホストがプレイヤー座標を変更する。 |
| `getState()` | `{quality,activated,awakened,area}`。 |
| `getPointsOfInterest()` | 4方向の接続口、塔、碑、転移台等の固定座標一覧。 |

インタラクション例：

```js
const near = area.getNearbyInteraction(playerFeet, 5.6);
if (near && pressedE) {
  const result = area.interact(near.id);
  if (result.warpTo) Object.assign(playerFeet, result.warpTo);
  if (result.message) showGameMessage(result.message);
}
const next = area.resolveHorizontal(nextX,nextZ,playerFeet.x,playerFeet.z,playerFeet.y);
playerFeet.x=next.x;
playerFeet.z=next.z;
playerFeet.y=Math.max(playerFeet.y,area.getFloorHeight(next.x,next.z,playerFeet.y));
```

ユーザーが`root.position`や`root.rotation`を変更した場合、**入力するx/z/yは全てrootのローカル座標**に変換してから渡す。描画とコリジョン関数はワールド変換を自動的に扱わない。root自体は原点固定・回転なしが最も簡単。

## 接続領域（ローカル座標 m）

| 接続ゲート | 中心座標 `(x,y,z)` | 方向 |
|---|---|---|
| SKY TRANSIT | `(0,0,-112)` | 北 / -Z |
| FORGE | `(112,0,0)` | 東 / +X |
| ARRIVAL | `(0,0,112)` | 南 / +Z |
| ARCHIVES | `(-112,0,0)` | 西 / -X |

- 都市基壇：外周半径約150m。歩行可能な中央エリアはおおむね半径134m。
- ゲート開口幅：約19m。ゲートと中央広場の間には幅19m前後の直線通路。
- 他チームの制作物は半径134m外側で道路を継げる構成。No.01は商店街・住居区画・NPC戦闘等を独占しない。
- 塔の上端：約272m。遠景の浮島シルエットは半径210〜260m付近。接続先が邪魔になる場合はNo.00側で遠景グループ`distant_*`を非表示または差し替え可能。

## 探索イベント

| ID | 位置 | 処理 |
|---|---|---|
| `ley-01` | `(0,0.42,81)` | 南の共鳴碑を起動 |
| `ley-02` | `(-55,0.42,-35)` | 西の共鳴碑を起動 |
| `ley-03` | `(55,0.42,-35)` | 東の共鳴碑を起動（全起動で`awakening`） |
| `lift-up` | `(29.2,0.84,0)`付近 | 展望環の `(18.5,64.16,0)`へワープ |
| `lift-down` | `(18.5,64.26,0)`付近 | 地上の `(29.2,0.42,0)`へワープ |
| `observatory` | `(0,64.16,-19.5)` | 歴史記録表示 |
| `archive` | `(-45,0.42,56)` | 碑文表示 |

イベントの進行状態はモジュールのインスタンス内メモリに保存。**永続セーブ機能は未搭載**。ゲーム全体で再ロード時の共鳴碑状態を再現する場合、No.00側で保存するか本モジュールへ状態復元機能を追加する必要がある。

## 描画設計

- 全アセットをThree.js組み込みGeometryとCanvasTextureで生成。画像ファイル・GLTF・追加ライブラリ不要。
- 建物やタワーの再使用部品は`InstancedMesh`。初期構築時に静的メッシュを自動バッチ化。回転環、共鳴碑のホバークリスタル、共鳴演出はバッチから除外。
- モジュールは外部レンダラーのpixelRatio / antialias / fog / shadow / colorManagementに変更を加えない。
- 背景シェーダー、照明、FPS/TPSコントロール、雲海、UIは**デモ側だけ**に存在。ホスト統合時は既存レンダラーを使う。
- `setQuality('lite')`は高品質装飾グループと粒子を非表示にする。メッシュ・バッファ自体は共有されるため、品質切替時にジオメトリの再生成はしない。

## 注意事項

- Three.js `0.160.0`を使用。異なる版のTHREEオブジェクトの混在は避ける。
- コリジョンは歩行デモ用の**簡易円形コリジョン**。建物面の精密物理衝突、NPC経路探索、物理エンジン連携はNo.00の共通システムで拡張。
- `update`でdtが過大にならないよう最大0.06秒にクランプ。
- iPhone 16でのFPS実測は未実施。デモの計測HUDを使って軽量版60fps目標・最低50fps目標、高品質版50fps目標に対する実機評価が必要。
- 初期状態の探索はデモ独自。統合版にカメラやUIを強制しない。

