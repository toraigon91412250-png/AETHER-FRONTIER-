# AETHER FRONTIER｜開発チーム No.03

## SKYWARD ARCHIPELAGO｜天空環状群島（v1.0.0）

中央都市の外縁に配置できる、独立型の天空浮遊島エリア。Three.js **0.160.0 / r160**、**Y軸上、前方 -Z、1単位 ≒ 1m** で制作。

ビルド不要、追加アプリ不要。画像や3Dモデルの外部アセットは使わず、全モデルをThree.jsのジオメトリから構築している。実行時に **Three.js r160本体をCDNから取得する**ため、初回表示にはインターネット接続が必要。

## ファイルの使い方

- **`AETHER_NO03_SkywardArchipelago_demo.html`**：単一のHTMLファイル。ブラウザで開くと探索デモを起動できる。HTML内部に制作コードを同梱済み。Three.jsだけはCDN経由。
- **`index.html` + `demo.js` + `aether-sky-islands.js`**：Cloudflare Pagesへ直接アップロードする静的サイト一式。`index.html`が入口。ビルド処理、wrangler設定、GitHub連携は不要。
- **`aether-sky-islands.js`**：ゲーム本体に統合するための独立モジュール。プレイヤー、ゲームカメラ、レンダラーは持たない。
- **`tests/smoke.mjs`**：Node.jsによる構造チェック。ブラウザ/WebGLの実機テストの代わりにはならない。

### Cloudflare Pagesへの配置

ZIPを解凍してファイルをそのままアップロードする（対応画面ならZIPアップロードも可）。**プロジェクトのルートに `index.html`、`demo.js`、`aether-sky-islands.js` の3つが置かれる**ようにする。ビルドコマンドや出力ディレクトリ指定は不要。

## 探索コンテンツ

| エリア | 内容 |
|---|---|
| 蒼風の艇庫 | 飛行艇ZEPHYRの係留場。ここから探索開始 |
| 環天の広場 | 環状航路の中心。浮遊ジャイロと古代地図の広場 |
| 光花の庭園 | 発光する花と半球型の温室。上昇気流あり |
| 蒼晶の採掘島 | 大型エーテル結晶、採掘クレーンと浮遊機構 |
| 天球観測院 | 最も高い主要島。星門の解放地点 |
| 風詠みの街 | 回転する風車、住宅群、上昇気流 |
| 雲上果樹園 | 果樹群、段々畑、監視塔とランタン |
| 古代環流炉 | 巨大エネルギー変換機構と発光リング |

**8つの主要島／10本の歩行橋／3つの上昇気流／5つの起動装置／飛行艇1機**。周辺には遠景用の小さな浮遊島や雲海がある。

プレイ目標は各地に眠る5つのエーテル灯を起動し、天球観測院の星門を開くこと。エーテル灯の再起動状態はデモ実行中に保持される（ページ再読み込みでリセット）。

## 操作

| 操作 | PC | iPhone / タッチ環境 |
|---|---|---|
| 前後左右移動・飛行 | WASD | 左側の仮想スティック |
| 視点操作 | マウス | 右側の画面をドラッグ |
| ダッシュ／高速飛行 | Shift | 標準速度（スマホでは高速飛行操作は未配置） |
| ジャンプ／上昇 | Space | 「ジャンプ／上昇」 |
| 降下 | Ctrl | 「降下」 |
| 飛行艇に乗る／降りる | F | 「飛行艇 乗降」 |
| 装置を起動する | E | 「起動」 |
| FPS / TPS切替 | V または画面右上 | 画面右上 |
| 軽量／高品質切替 | Q または画面右上 | 画面右上 |

飛行艇から降りるときは、島・橋の近くまで下降する必要がある。徒歩で空中へ落下した場合は出発地点へ復帰する。

## 統合用API

```js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { createAetherModule, createAetherSkiff } from './aether-sky-islands.js';

const archipelago = createAetherModule(THREE, {
  quality: 'low',          // 'low' | 'high'
  includeSky: false,      // 総合ゲームの空を使う場合は false
  bakeStatic: true        // 静的な装飾をバッチ化
});

// scene / renderer / camera は統合側の既存インスタンスを使う
scene.add(archipelago.root);

// 中央都市との衝突を避けるため、統合時は総監督が配置を決める
archipelago.root.position.set(420, 70, 0);

// 既存のゲームループ内で
archipelago.update(dt, { playerPosition: player.position });

// 画質変更
archipelago.setQuality('high');

// プレイヤーのローカル座標から簡易地面判定
const localPos = archipelago.root.worldToLocal(player.position.clone());
const ground = archipelago.sampleGround(localPos.x, localPos.z, localPos.y);
// ground?.height はモジュール内部のローカル座標。

// プレイヤーの船として個別配置可能な、描画専用の飛行艇モデル
const skiff = createAetherSkiff(THREE);
scene.add(skiff); // 移動・入力・カメラ追従は統合側が担当

// このエリアを外すとき
scene.remove(archipelago.root);
archipelago.dispose();
skiff.userData.dispose();
```

`createAetherModule(THREE, options)` の**必須インターフェース**：

- `root`: `THREE.Group`、シーンに配置する描画ルート
- `update(dt, context)`: 秒単位の経過時間を受けてアニメーションを更新
- `setQuality(mode)`: `'low' | 'lite' | 'high'` を受け付ける
- `dispose()`: このモジュールが所有するジオメトリとマテリアルを破棄

追加の公開関数：`sampleGround(x,z,currentFeetY)`, `resolveFootCollision(position,radius)`, `closestBeacon(position,maxRange)`, `activateBeacon(id)`, `activatedCount()`, `getBeacons()`, `getUpdraft(position)`, `getQuality()`, `metadata`。

**座標注意**：これらの地形・ギミック判定APIは**モジュールのローカル座標**を使う。`root.position`や`root.rotation`を変更する場合、プレイヤーのワールド座標を`root.worldToLocal()`で変換すること。判定高さもローカル値のため、ワールドへ戻す際は`root.localToWorld()`を使う。

**衝突判定注意**：簡易判定が対象とするのは、8主要島の歩行面・10本の橋・主要デッキ・一部の建物。飛行艇と建物の詳細な衝突処理、全ての装飾品への精密衝突は実装していない。統合ゲームの物理エンジンがあれば差し替え可能。

## 画質とパフォーマンス設計

- **軽量版**：雲のインスタンス数を減らし、追加の遠景島・島の下面装飾・ミスト・細部の発光リングを非表示。描画解像度は控えめ（スマホ1.15倍を上限）。
- **高品質版**：下面のクリスタルやリング、遠景島、濃密な雲海を表示。描画解像度をスマホでは1.5倍を上限として表示。
- `InstancedMesh`により果樹や雲などの同型オブジェクトをまとめる。多数の建築部品は静的ジオメトリを同一マテリアル単位で結合し、描画回数を削減する。
- 装飾は手続き生成し、巨大なテクスチャ転送・動画・後処理パス・動的影マップの負荷を避ける。

**性能目標**：iPhone 16 Safariの軽量版でできれば60fps、最低50fps。高品質版は画質を優先しながら50fpsが目標。**iPhone 16実機では未計測**。FPS表示は端末上の動作時に推定値を示す。環境差・ブラウザ差があるため性能を保証するものではない。

## 検証

実施済み：JavaScript構文チェック（モジュール・デモ・単体HTMLの統合スクリプト）、モジュールの起動と破棄、8島/10橋のメタデータ、190点の橋歩行面サンプル、5装置の起動と二重起動防止、画質切替、飛行艇モデル生成、静的バッチ処理の構造テスト。

構造テスト用モックでカウントした可視メッシュ：高品質約126／軽量約118（**実際のGPU描画呼出回数ではない**）。ブラウザによるWebGLの実描画、モバイルのタッチ挙動、iPhone 16のfpsは未検証。正式統合前の実機検証が必要。

## 統合上の注意

本チームは中央都市の制作を行わず、群島を中心に完成させた。No.01/No.02の中央都市と重ならないよう、都市外縁の座標や高度への`root`配置はNo.00で決定すること。モジュールは画面UI・プレイヤー・カメラ・レンダラーに依存しないため、統合ゲーム内の既存システムで動かせる。
