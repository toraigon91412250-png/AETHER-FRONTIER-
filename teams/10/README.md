# AETHER FRONTIER｜No.10 変形ロボット

**モデル:** ARCHAION X / SKYWARD TRANSFORMER（アルカイオンX）  
**担当:** No.10 / 独立3Dモジュール  
**基準:** Three.js **0.160.0**、Y軸上、前方 **-Z**、1 unit ≈ 1 m

## 納品物

- `index.html` : **単体デモ**。HTML単体で、回転表示・人型⇄飛行型の変形・変形途中停止・歩行/浮遊・軽量/高品質切替を試せる。追加ビルド不要。
- `src/aether_no10_robot.js` : **ゲーム統合用**のESモジュール。表示環境やカメラには依存しない。
- `integration-example.html` : ソースJSを直接importして利用するサンプル。
- `README.md` : この仕様書。

`index.html`はロボット本体のソースをファイル内に埋め込んでいます。ネットワークから取得するのは **Three.js 0.160.0** のみです。CDN（jsDelivr、代替として cdnjs）への接続が必要です。Cloudflare Pagesの直接アップロードを想定し、npmやビルドコマンドは不要です。

## モデリング / 動作のポイント

- **人型守護機**: パネルで分割した胸部・肩・両腕・両脚、光る主動力炉、額飾り、腰回転部、関節軸、擬似油圧シャフトなど。頭部の目安高さ約7.0 m（翼端はそれより高くなる場合がある）。
- **高速飛行型**: 胴体を前傾させてノーズ化、腕を水平に展開、折り畳み翼を2関節で展翼、脚を後方へ折り、かかとのノズルを推進器に転用。想定展翼幅は約11 m。
- **常に同じ部品**: 人型と飛行型でパーツの入替・非表示・瞬間移動をせず、各ピボットを回転させて連続変形。頭部は同一レール沿いに少し後退。
- **運動**: アイドル、歩行、飛行浮遊、コアの多層逆回転、発光の脈動。
- **画質切替**: 高品質では鋲・油圧シャフト・装飾などを表示。軽量では高密度装飾58メッシュを非表示。幾何学キャッシュ共有でCPU/GPUメモリの重複を抑える。
- **固定する責務**: レンダラー、シーン、カメラ、照明、入力、当たり判定、音声、戦闘処理、飛行移動・物理は**統合側の責務**。本モジュールは3Dモデルと演出のみ。

## API

```js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { createAetherModule } from './src/aether_no10_robot.js';

const unit = createAetherModule(THREE, {
  quality: 'lite',        // 'lite' | 'high' （デフォルト high）
  initialForm: 'robot',  // 'robot' | 'flight'
  motion: 'idle'         // 'idle' | 'walk' | 'hover'
});
scene.add(unit.root);
unit.root.position.set(30, 0, -80); // ワールド配置は統合側で管理

unit.transformTo('flight', 2.8);   // 目標形態と秒数（0.3〜20）
unit.transformTo('robot', 2.8);
unit.setTransformProgress(0.42); // 0=人型,1=飛行型。途中で停止可能
unit.setMotion('walk');          // 'idle', 'walk', 'hover'
unit.setQuality('high');         // 'lite', 'high'
unit.update(dt, context);       // 毎フレーム更新。dtは秒単位
const status = unit.getState();  // progress, target, form 等の状態
unit.dispose();                 // 必要がなくなったら一回だけ
```

`update(dt, context)`の任意の外部制御チャンネル:

```js
unit.update(deltaSeconds, {
  // transformTo: 'flight',        // 対象を指定したいときのみ
  // transformProgress: 0.5        // 強制指定したいときのみ
});
```

`transformProgress`を毎フレーム渡す場合は内部アニメーションより外部値を優先します。`root`のローカル原点が地面の基準です。`root.scale`や`root.rotation`は統合側で変更してかまいません。現在のモーションは局所関節アニメーションで、`root`を勝手に移動しません。移動速度・入力・判定は統合側が与えてください。

### 統合時の推奨

1. `root`を本編シーンに追加。
2. 操作キャラの変形イベントに合わせて`transformTo`を呼ぶ。
3. 移動入力と地形・衝突・航空挙動はNo.19や統合システムに渡す。
4. 品質プリセットはNo.17から`setQuality`で配信する。
5. ステージ離脱時に`dispose()`を呼ぶ。別インスタンス間でジオメトリ/マテリアルは共有しない。

## 操作（単体デモ）

- ドラッグ：モデルの周囲を回転観察。自転は停止する。
- マウスホイール・2本指ピンチ：ズーム。
- **人型 / 飛行型**：自動変形。**変形検証スライダー**：途中で停止。
- **待機 / 歩行 / 浮遊**：モーション変更。
- **高品質 / 軽量**：装飾量と描画解像度を変更。
- **自転 ON/OFF**：カメラの自動回転。
- PCキー：`R` 人型、`F` 飛行型、`Q` 画質、`Space` 自転切替。

## 検証と性能

- `node --check` で統合JSと単体HTML内部のmodule scriptを**構文検証**。
- 代替Threeオブジェクトを使い、**モジュール構築・軽量化・変形の完走・中間停止・dispose**を確認。
- 実装メッシュ数：**245**（high）、**187**（lite）。共有ジオメトリは127種類。実レンダリング時は背景・台座分の追加描画があります。
- **iPhone 16 Safariや実GPUでのFPS計測は未実施。**60fps・50fpsの合格を示すものではありません。デモには実行端末上でのFPS表示を設けています。
- 開発環境から外部CDNへのアクセスが制限されているため、ブラウザでの実画面確認は未実施です。公開後はiPhone Safariで操作・見た目・フレーム時間を確認してください。

## 注意

- デモに登場する台座、照明、展示室HUDは統合用モジュールには含めていません。
- 既存ゲームの戦闘やプレイヤー操作には干渉しません。
- three.jsはMIT Licenseのライブラリです。ここではCDN経由で取得します。
