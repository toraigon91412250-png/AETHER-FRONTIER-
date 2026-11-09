# AETHER FRONTIER — 開発チーム No.18
## ETHERWEAVE ATMOSPHERE v1.0 / 空・雲・天候モジュール

**Three.js 0.160.0 / Y軸上 / 前方-Z / 1単位≒1m / ビルド不要**

### 納品物

- `index.html` — 単体デモ。モジュール実装コードをHTML内に埋め込み済み。操作パネルで時刻・6種の天候・画質・雲海を切り替え。デモ用浮遊観測所は統合モジュールには含まない。
- `aether-atmosphere.js` — No.00統合向けの独立ESモジュール。Three.jsのimportは不要。外部からTHREE名前空間を注入。
- `integration-example.html` — モジュールを実際に `import` する最小統合例。
- `README.md` — この資料。

HTMLデモと統合例はThree.js本体を **jsDelivr CDN** からロードするため、表示時はインターネット接続が必要。npm、ビルド、GitHub、外部アセット、追加アプリ、APIキーは不要。

Cloudflare Pagesの **直接アップロード** にはZIPの中身をそのままアップロードできる。`index.html` がZIP直下にあり、`wrangler.toml`・`package.json` は含まない。

### No.00向けの統合

```js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { createAetherModule } from './aether-atmosphere.js';

const atmosphere = createAetherModule(THREE, {
  quality: 'lite',             // 'lite' | 'high'
  timeOfDay: 16.5,            // 0.0 - 24.0
  weather: 'clear',           // 下記6種から指定
  cloudSea: true,             // true/false
  cloudSeaLevel: -120,        // ワールドの雲海基準高度 (m)
  autoCycle: false,           // trueにすると時刻を自動進行
  dayLengthSeconds: 240       // 自動進行時、ゲーム内1日の秒数
});
scene.add(atmosphere.root);

// 統合側のゲームループ。cameraは毎フレーム渡す。
atmosphere.update(dt, { camera });

// ステージ遷移・ゲームイベントから呼べる。
atmosphere.setWeather('storm', 3); // 約3秒で気象を遷移
atmosphere.setTimeOfDay(22.5);
atmosphere.setQuality('high');
atmosphere.setCloudSeaLevel(-80);
atmosphere.setCloudSeaEnabled(false); // 地下等で雲海のみ非表示
atmosphere.setWindSpeed(1.8);         // nullなら天候プリセット由来の風

// 破棄時: 二重呼び出しも安全
scene.remove(atmosphere.root);
atmosphere.dispose();
```

戻り値の契約: `root`, `update(dt, context)`, `setQuality(mode)`, `dispose()` を必ず提供。
追加API: `setWeather(name, seconds=2)`, `setTimeOfDay(hour)`, `setAutoCycle(enabled, daySeconds?)`, `setCloudSeaLevel(height)`, `setCloudSeaEnabled(enabled)`, `setWindSpeed(speed)`, `getState()`, `getLightingHint()`。

`update(dt, context)` は `context.camera` (THREE.Camera) の世界座標に遠景と降水エフェクトを追従させる。`context.timeOfDay`、`context.weather`、`context.windSpeed` の指定も可能。`context.timeOfDay` が毎フレーム与えられた場合はその時刻を優先する。

`getLightingHint()` は太陽方向・推奨ライト色・昼間明るさを返す **読み取り専用** の値。太陽光・環境光を実際に変更するのはNo.00側。No.18はライティングシステムを上書きしない。

### 天候プリセット

| コード | 日本語 | 演出 |
|---|---|---|
| `clear` | 快晴 | 澄んだ空と薄い雲、視界の良い遠景 |
| `cloudy` | 曇り | 上層の雲と雲海が増加 |
| `mist` | 霧 | 地平線の霞と柔らかい空色 |
| `rain` | 雨 | 濃い雲とGPUアニメーション降雨 |
| `storm` | 雷雨 | 暗雲・強風・激しい雨・ランダム閃光 |
| `aurora` | オーロラ | **夜間のみ** オーロラの光帯が出現（昼はほぼ見えない） |

日の出と日没の時間帯には暖色の大気が生まれ、夜には星と月が浮かぶ。太陽は06:00頃に昇り、18:00頃に沈む。昼夜でパレットは連続補間。雲海の高さはワールド単位で調整できる。

### レンダリングと独立性

- SkyDome: 球体1メッシュ、奥行き書き込みなし、背景より手前のオブジェクトを隠さない。
- 高層雲・オーロラ・星: シェーダー内で描画。画像・テクスチャ転送なし。
- 雲海: 半透明の広いシート1メッシュ。カメラのX/Zに追従し、Y高度はワールドに固定。
- 遠景積雲: `InstancedMesh` ×2、最大256インスタンス×2。風によるゆっくりした動き。
- 雨: `THREE.Points` ×1。静的頂点群をGPUシェーダーで落下させる。
- モジュールは最大約5ドローコール相当（各要素が可視のとき）。実際のドローコールはビューやレンダラー内部による。
- Lite: 上層雲の追加ノイズを省略、低密度の積雲、380雨粒。
- High: 上層雲とオーロラ、積雲最大256×2、1120雨粒。

**重要:** `renderer`, `scene.background`, `scene.fog`, `scene.environment`, `toneMapping`, `shadowMap`, `camera` をNo.18のモジュールは変更しない。デモ用 `index.html` は、その独立したデモ専用レンダラーを作成するために、デモ内で画質のピクセル比を設定する。

複数のNo.18インスタンスを同一シーンに配置する必要はない。No.00側では原則1インスタンスを生成し、ステージを切り替えても使い回すのが軽量。地下研究施設のような屋内ではNo.00側が `root.visible=false` にする、または本編の内部空間の遮蔽物で覆う。

### パフォーマンス・実測状況

- CPU側で雨粒や雲の頂点を毎フレーム更新しない。
- Geometry、Material、uniformは初回生成して使い回す。
- 描画負荷はシェーダーノイズ、高い画面解像度、透明雲海、ホスト側のシーン負荷に依存。
- デモUIのFPSは、そのブラウザセッションで計測した **参考表示**。60fps等を保証する指標ではない。
- 開発環境のChromium WebGLで、空（Lite/High）・雲海（Lite/High）・雨（共通）の5種類のシェーダーについてコンパイルとリンクを確認。
- APIの状態変更、カメラ追従、破棄のNodeモックテストを通過。
- **実機iPhone 16 Safariでの測定・単体デモ実行検証は未実施**。統合時はNo.00側で軽量版50fps以上を実機検証する。

### 採用時の注意

1. カメラの追従を正しく維持するため `atmosphere.update(dt,{camera})` を毎フレーム呼び出す。
2. 雲海の位置が地面と干渉する場合は `cloudSeaLevel` を十分下げる、あるいは `setCloudSeaEnabled(false)` を使う。
3. No.17の全体画質管理が `setQuality('lite' | 'high')` を一括呼び出せる。
4. No.00は任意で `getLightingHint()` を使ってゲーム内の主光源色を同期できる。
5. ビルド不要で配布できる一方、Three.js CDNにアクセスできない環境では初回読み込みに失敗する。オフライン用のThree.js同梱は今回の納品範囲外。
