# AETHER FRONTIER | Team No.09 | ARK VESPER

**モデル名：宵環級・超巨大エーテル空中戦艦「ARK VESPER」**

科学と古代魔法を統合した、探索可能な約400m級の空中戦艦。Three.js **0.160.0** 対応。

## ファイル構成

- `index.html`：Cloudflare Pagesへそのままアップロード可能なビルド不要デモ（ソースを内蔵）。
- `AETHER_FRONTIER_No09_ARK_VESPER.html`：単体プレイ用HTML（`index.html`と同じ内容）。
- `src/aether-no09.js`：ほかのチームのThree.jsアプリに組み込む独立ESモジュール。
- `integration-example.html`：独立モジュールの最小接続例。
- `README.md`：統合仕様と検証上の注意。

**注意：** Three.js本体のみCDN（jsDelivr）から読み込みます。インターネット接続が必要です。追加アプリ・ビルド工程・有料サービスは不要です。Cloudflare Pagesへの直接アップロードに対応した、設定ファイルなしの静的構成です。

## デザインと主な可動部

- 船体全長 **392m**、翼端幅 **約220m**、艦首方向 **-Z**、Y軸上、1unit ≈ 1m。
- くさび型の多層装甲船体、舟形の下面キール、艦首のエーテル導光ブレード。
- 中央の多重円環主炉（正反転・結晶核変位・エネルギーパルス）。
- 4基の大型推進機（2主機＋2補機、排気の明滅）。
- 左右重力安定環、6基の装飾的なSFエネルギー射出口、電飾や微細な船体リブ。
- 前部から後部まで連続した歩行可能甲板。右舷（+X）に開放式格納庫と傾斜スロープ。
- 格納庫シャッター開閉、内部作業架台・小型シャトル・誘導灯。

## 統合API

```js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { createAetherModule } from './src/aether-no09.js';

const no09 = createAetherModule(THREE, {
  quality: 'low',             // 'low' / 'high'
  position: [0, 200, 0],     // 原点は船体中心付近。自由に配置できる
  rotationY: 0,              // 正面は -Z
  scale: 1                   // 1=実寸（約1m/unit）
});
scene.add(no09.root);

function frame(dt, elapsedTime) {
  no09.update(dt, { elapsedTime });
}

no09.setQuality('high');
no09.triggerPulse();           // 観賞用主炉パルス（ダメージやゲーム進行は操作しない）
no09.setHangarOpen(false);    // シャッターを閉じる
const anchors = no09.getAnchors();
const surfaces = no09.getWalkableSurfaces();
const localY = no09.sampleWalkable(0, 50, 32.18);
// scene.remove(no09.root); no09.dispose();
```

`createAetherModule(THREE, options)` は `root`, `update(dt, context)`, `setQuality(mode)`, `dispose()` を必ず返す。追加で `getAnchors`, `getWalkableSurfaces`, `sampleWalkable`, `setHangarOpen`, `triggerPulse`, `metadata` を公開。

- `root` は THREE.Group。内部でカメラ、レンダラー、シーン、ライト、操作系を生成・変更しない。
- `update(dt, context)`：`dt` は秒。`context.elapsedTime` は任意。未指定時は `dt` を積算。
- `setQuality(mode)`：`'low'` では細密装飾・一部排気を非表示、`'high'` では描画。レンダラーのpixelRatioなどは**統合側で管理**。
- `dispose()`：このモジュール内で生成したジオメトリ、マテリアル、CanvasTextureを解放。複数回呼んでも安全。
- `sampleWalkable(x,z,lastY)`：船体**ローカル座標**の徒歩移動に使う簡易高さマップ。移動不可なら `null`。ローカル変換と一般物理衝突判定は統合側の責務。
- `getWalkableSurfaces()`：甲板、格納庫、連絡スロープの矩形範囲・高さ情報。スロープの傾斜式も文字列で渡す。
- `getAnchors()`：甲板前後、主炉、格納庫、推進機などの座標。座標は**ローカル**。

### 重要な探索座標

| エリア | ローカル座標 | 基本高さ |
|---|---|---:|
| 前甲板 | (0, 32.18, -115) | 32.18m |
| 中央甲板 | (0, 32.18, 10) | 32.18m |
| 後甲板 | (0, 32.18, 117) | 32.18m |
| 格納庫進入ランプ | (15〜48, -, 56〜96) | 32.1m→27.1m |
| 格納庫 | (67, 27.18, 72) | 27.18m |
| 回転炉心 | (0, 100, 48) | 非歩行ポイント |

### 単体デモ操作

**観賞モード：** マウスドラッグ・スワイプで回転、ホイール・ピンチでズーム。艦首・側面・俯瞰・艦尾・炉心・格納庫カメラを切り替え可能。

**探索モード：** PCはWASD／矢印で移動、ドラッグで視点、Shiftでダッシュ、Spaceでジャンプ、VでTPS/FPS切替、Hで格納庫へ移動、Escで観賞に戻る。スマホは左仮想スティック＋右側スワイプで移動と視点、画面ボタンでジャンプ・視点切り替え・格納庫移動。

## 品質・パフォーマンス

- 主要装甲や小物は InstancedMesh で集約。外部テクスチャなし、CanvasTextureによる艦名刻印のみ。
- シャドウマップ・重いポストプロセスを使用しない。
- 軽量版は細部インスタンスを非表示、排気透過量も削減。単体デモはpixelRatioも低くする。
- **目標**：iPhone 16 Safari軽量版60fps、最低50fps／高品質版50fps。ただし**iPhone実機での測定は未実施**。PCのFPS計は参考値。
- マップと衝突判定は統合ゲーム側で最適化・拡張する設計。艦橋展望座標など一部は観測用アンカーで、単体デモでは甲板と格納庫の移動に限定。

## 配置と注意

- 通常の静的ホスティングでは `index.html` をルートに配置するだけでよい。
- 旧バージョンのAPI互換性より、明示された2026-11-09仕様（Three.js 0.160.0）を優先。
- 他AIチームのドローン・プレイヤー・戦闘処理は一切組み込まない。追加の当たり判定、攻撃制御、イベント連携などは外部から実装可能。
- ホスティングにネットワーク接続がない場合はthree.js CDNが読み込めず、表示できない。必要なら既存のThree.jsファイルを同梱するオフライン派生版に変更可能。
