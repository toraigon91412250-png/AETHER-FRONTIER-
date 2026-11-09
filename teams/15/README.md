# AETHER FRONTIER / No.15

## VESPER PRISM | 星環裂刃 (v1.0)

古代星図で生成されるエーテル刃と、左右独立駆動の装甲レールを持つ、完全架空の大型魔導剣。ゲーム用の**ビジュアルモデル**であり、攻撃判定・ダメージ・操作入力・カメラは含めない。

### ファイル

- `index.html`：Cloudflare Pagesに直接アップロードするためのトップページ。ビルド不要。
- `aether15_demo.html`：単体鑑賞デモ（`index.html` と同じ内容）。単独で開ける。
- `aether15_weapon.js`：統合用ESモジュール。Three.jsを外から渡す設計。
- `TEST_REPORT.md`：実施した検査と未実測事項。

**Three.jsの読み込みだけはネット接続が必要。** HTMLはThree.js **0.160.0** を jsDelivr CDN から読み込み、障害時には unpkg CDN を試す。画像・フォント・モデルデータ・その他ライブラリは不要。ZIPにビルド設定ファイルや`wrangler.toml`は含まれない。

### プロジェクト統合

既存の描画ループを持つアプリで以下のように呼び出す。レンダラー、シーン、カメラを生成・所有するのは**統合側**。

```js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { createAetherModule } from './aether15_weapon.js';

const weapon = createAetherModule(THREE, {
  quality: 'high',          // 'low' | 'high'
  form: 'sealed',           // 'sealed' | 'awakened'
  charge: 0.3              // 0.0 - 1.0
});

scene.add(weapon.root);
weapon.root.position.set(0, 1.2, 0);
// 毎フレーム、秒単位のdtを渡す。
weapon.update(deltaSeconds);

// 外部側から制御可能。
weapon.setForm('awakened');
weapon.setCharge(0.85);
weapon.playAction('pulse');
weapon.playAction('slash');
weapon.setQuality('low');

// contextも利用可能。chargeとformは省略してよい。
weapon.update(deltaSeconds, { charge: 0.5, form: 'awakened' });

// このインスタンスをゲームから取り外す時だけ呼ぶ。
scene.remove(weapon.root);
weapon.dispose();
```

### モジュール契約

`createAetherModule(THREE, options)` の返却値：

| 名称 | 仕様 |
|---|---|
| `root` | `THREE.Group`。統合側が位置、角度、スケールを管理する |
| `update(dt, context?)` | 秒単位の差分時間でアニメーションを更新。`context.charge`と`context.form`に対応 |
| `setQuality('low' | 'high')` | 重い装飾、エフェクトを非表示・再表示 |
| `dispose()` | モデル内で生成したGeometryとMaterialを破棄。複数回呼んでも安全 |
| `setForm('sealed' | 'awakened')` | 通常・覚醒形態を滑らかに切替 |
| `setCharge(value)` | 0から1の発光・エネルギー強度目標 |
| `playAction('pulse' | 'slash')` | 純粋な視覚アニメーション開始 |
| `getState()` | 形態、品質、充填状態を返す |

### 座標・描画

- Three.js `0.160.0`、右手系、**Y軸上 / 前方 -Z / 1単位 ≒ 1m**。
- 根元の原点は持ち手前方付近。刃先はおよそZ=-2.5、ポメルはZ=+1.3。全長約3.8mの大型剣。
- すべての動作は`root`の子グループ内で処理。`root.position`や`root.rotation`は一切書き換えない。
- 処理時に新規ジオメトリを毎フレーム生成しない。幾何形状は手続き生成、発光はメッシュで表現（追加ポストプロセスなし）。
- 軽量版では高品質専用の星環、彫刻、結晶破片、光の帯を非表示。画質切替と解像度調整は単体デモ側の処理。
- 複数インスタンスを作成できる。ただし各インスタンスでリソースを独立生成するため、大量複製するゲームでは統合側で別途共有設計を検討。

### デモ操作

- **鑑賞**：ドラッグで回転、ホイール/2本指で拡大縮小。
- **FPS**：一人称視点での配置例。**TPS**：簡略プレイヤー模型を使った大きさの比較。
- **通常形態 / 覚醒形態**：刃レールと護拳、星環が可動。
- **魔力脈動 / 剣閃**：視覚演出。戦闘システムへの干渉なし。
- **高品質 / 軽量**：装飾の描画数とレンダリング解像度を切り替え。
- キーボードは `1`=鑑賞 / `2`=FPS / `3`=TPS / `F`=形態切替 / スペース=魔力脈動。

### Cloudflare Pagesアップロード

ZIPを展開した**中身のファイルがルートに来る**ように、PagesのダイレクトアップロードへフォルダーまたはZIPを送る。`index.html`が公開ページになる。ビルド作業・GitHub連携・追加アプリ不要。

### FPS目標について

PCとiPhone 16 Safariで軽量版60fps目標、最低50fps合格目標、高品質版50fps目標に合わせた描画設計。ただし端末上での実測はしていないため、フレームレート達成は現段階では未判定。デモ右上のfps・DRAW・TRIS表示を使って実機で確認可能。
