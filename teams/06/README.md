# AETHER FRONTIER / No.06
## THE AETHER FOUNDRY（エーテル鋳造炉）

SF工学と古代魔法の融合をテーマにした、探索可能な大規模3D産業プラント。

### すぐ遊ぶ

- `AETHER_FRONTIER_No06_Demo.html`：1ファイルの単体デモHTML。ダブルクリック、または静的サイトへアップロード。ソースはHTML内に埋め込み済み。**Three.js 0.160.0の読み込みだけインターネット接続が必要**。
- `index.html`：ZIP展開後にそのまま静的ホスティングするための入口。`src/`ディレクトリが必要。
- HTML内でスクリプトをビルド、変換する工程は不要。`wrangler.toml`や`package.json`も必要なし。

Cloudflare Pages Direct Uploadでは、ZIPを展開して `index.html` と `src/` を同じルートに置く。単体HTMLだけ公開する場合はファイル名を `index.html` に変更する。

**外部依存**：`https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js`。独自画像、3Dモデル、課金API、追加アプリ、ビルドツールは不要。

### ステージと探索

- 舞台：幅約92m × 奥行約100m、高さ約30mの巨大プラント
- 中心：ARC-HEART封じ込め炉、多重回転ジャイロリング、発光する結晶心臓、12本の電力支柱
- 左右：MONOLITH A/Bタービン。大型ローターが逆回転
- 左前方：NANOFORGE搬送ライン。6個の部品コンテナが循環移動
- 右前方：SINGULARITY PRESS。周期駆動する打ち抜きヘッド
- 各所：サーボアーム3基、長距離天井クレーン、冷却タンク、配管、梁、格子床
- 探索：地上フロア、**高さ10mの側面作業通路と2本の横断橋**、西側に長い昇降用スロープ
- ゲーム内操作：地上3基の制御コンソールを起動。上階のFINALコンソールで炉心が最大出力へ移行

#### デモの操作

| 操作 | PC | iPhone / タッチ |
| --- | --- | --- |
| 移動 | WASD / 方向キー | 左下のジョイスティック |
| 視点 | マウス移動（ポインターロック）またはドラッグ | 右側の空いた画面をドラッグ |
| 走行 | Shift | RUN長押し |
| ジャンプ | Space | JUMP |
| 装置操作 | E | 操作 |
| FPS/TPS | V / T | 右上「視点」 |
| 画質切替 | Q / 右上ボタン | 右上「画質」 |

FPS/TPS切替、アバター、デモ用の移動・重力・基本的な簡易コリジョンは`demo_app.js`にのみ含まれる。統合側では既存のプレイヤー操作をそのまま使用できる。

### 統合API

**Three.js 0.160.0固定**。単位は約1m、Y軸上、前方は-Z。モジュールは**レンダラー・カメラ・シーン・DOMのゲームUI・プレイヤー入力を作成/所有しない**。テキスト看板のCanvasTextureだけブラウザDOMを利用する（DOMなし環境では看板を省略する）。

```js
import { createAetherModule } from './src/aether_plant.js';

const plant = createAetherModule(THREE, {
  quality: 'low', // 'low' | 'high'
  onEvent(event) { console.log(event.type, event.id, event.message); }
});

// Placement is controlled by the host scene:
scene.add(plant.root);
plant.root.position.set(180, 0, -250);
plant.root.rotation.y = Math.PI / 2;

// Drive using the host game's own loop:
plant.update(deltaSeconds, { timeScale: 1, playerPosition: player.position });

plant.setQuality('high'); // 'low' also supported

// Remove entire module, geometry, materials, and textures:
plant.dispose();
```

必須戻り値：

- `root: THREE.Group`：プラント本体。世界上の配置・回転・スケールを外部管理
- `update(dt, context)`：1フレームを更新（dt秒）。`context.timeScale`は省略可。レンダラー依存なし
- `setQuality('low' | 'high')`：装飾物、粒子、補助ライトを切替（ベースとなる機械アニメーションは両モードで稼働）
- `dispose()`：モデル用Geometry / Material / Textureを明示的に破棄

オプションAPI：

- `navigation.spawn`：ローカル座標 `{x:0, y:0, z:42, yaw:0}`
- `navigation.bounds`：ローカル施設境界
- `navigation.sampleGround(localX, localZ, feetY)`：地上・スロープ・上階の足元高さを返す。施設外は`null`
- `navigation.collides(localX, localZ, radius, feetY)`：主要な地上機械に対する簡易衝突判定
- `navigation.solids / upperWalkways / ramp`：統合側の本格的なコリジョン作成用データ
- `getNearestInteraction(worldPosition, range=3.5)`：ワールド座標で最寄りのコンソールを取得。位置・回転済みの`root`に対応
- `interact(id)`：コンソール`'01'`, `'02'`, `'03'`, `'FINAL'`の状態を切り替える
- `getState()`：稼働状況と画質を参照する
- `getBounds()`：サイズ取得

`navigation`は**ローカル座標**。`root`を移動・回転させて統合する場合、`navigation.sampleGround/collides` に渡す座標は、`plant.root.worldToLocal(...)`等で変換する。

**注意**：装置とのインタラクションAPIはデモ用の探索体験に含めたもの。統合側のUI、セーブ、物理エンジン、ドアギミックと独立しているため、ホスト側から必要な処理に連携できる。

### 描画・パフォーマンス

- 外部のモデルファイルを使用しない、Three.jsの基本ジオメトリによる3Dモデル
- 固定構造物に`THREE.InstancedMesh`を使用し、同マテリアルの梁・床ライン・装飾をまとめる
- グラフィックスの影計算を標準でOFF
- 軽量モード：補助照明・光粒子・小装飾を非表示、デモのピクセル比をiPhoneで1.0に設定
- 高品質モード：浮遊エネルギー粒子180個、細部の構造材、補助照明をON
- デモのみ自動的に端末のポインター種別から初期画質を選択し、両モードを手動切替可能

**測定上の注意**：実際のiPhone 16 Safari実機でのfps計測は実施していない。60fps/最低50fpsは目標であり、保証値ではない。統合後は他チームモデルとの合算負荷を測定して調整が必要。

### テスト

実施：

1. Node.js `--check` によるモジュール、デモスクリプト、インラインHTML内JSの構文チェック
2. `node tests/module_smoke.mjs` によるモジュールファクトリー、各設備の更新、上下移動の地面サンプリング、衝突判定、3つの制御シーケンス、オーバードライブ、画質切替、廃棄処理のAPI検査
3. HTMLのインライン化と必須ファイルの存在・構成チェック

未実施：外部Three.js CDNの読み込みが制限された作業環境のため、WebGL実描画テスト、実際のプレイ感の視覚的確認、iPhone 16 Safariでの実機fps測定は未実施。

### ソースZIP内容

```
AETHER_FRONTIER_No06_Source.zip
├── index.html                         # Cloudflare Pages静的サイト入口
├── AETHER_FRONTIER_No06_Demo.html     # 単体デモHTML
├── src/
│   ├── aether_plant.js               # 統合用モジュール
│   └── demo_app.js                   # 単体デモの描画・入力
├── tests/
│   └── module_smoke.mjs              # WebGLなしAPIテスト
└── README.md
```
