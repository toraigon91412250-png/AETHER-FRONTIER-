# No.16 敵AI・モデル / 統合API

```js
import * as THREE from 'three';
import { createAetherModule } from './enemyModule.js';

const bot = createAetherModule(THREE, {
  quality: 'low',           // 'low' または 'high'
  maxHP: 480,
  speedScale: 1,
  position: { x: 0, y: 0, z: 0 },
  onEvent(event) {
    // ゲーム側がHPやエフェクトに反映
    if (event.type === 'playerHit') {
      player.takeDamage(event.damage);
    }
  }
});
scene.add(bot.root);

// ゲームループから（dtは秒、推奨60Hz、内部で最大0.05秒へクランプ）
bot.update(dt, {
  player: {
    position: player.position,  // Vector3または{x,y,z}
    radius: 0.42,               // 水平当たり判定（m）
    height: player.airHeight,   // 地面からの高さ（m）
    invulnerable: player.dodging
  }
});

// プレイヤー攻撃が当たった場合
bot.receiveHit({ damage: 18, stagger: 22, position: player.position });

bot.setQuality('high');
// ステージ終了時
bot.dispose();
```

### 基本API

| 関数 / プロパティ | 内容 |
| --- | --- |
| `root` | 3Dモデル＋予兆群が入る `THREE.Group`。シーンへの追加・移動可能 |
| `update(dt, context)` | 1フレーム進行。敵が攻撃判定を行いイベントを発火。返値は `snapshot()` と同型 |
| `setQuality('low'\|'high')` | 装飾モデルを切替。戻り値は有効な画質名 |
| `receiveHit({damage,stagger,position})` | 敵への外部攻撃。弱点倍率などを計算。結果を返す |
| `snapshot()` | HP、体勢値、形態、状態、攻撃進捗、座標、弱点状態などのスナップショット |
| `reset({position?, facing?})` | 状態、HP、体勢、攻撃を初期化 |
| `setTarget({x,y,z})` | `update` にターゲットを渡さない場合の固定ターゲット（nullで解除） |
| `setBehavior('aggressive'\|'passive')` | 自律攻撃を許可または停止。passiveでも移動・追跡は継続 |
| `setEnabled(bool)` | AIの進行を停止・再開。待機アニメーションは継続 |
| `setPosition(x,y,z)` | モデルのワールド位置を設定（Vector3も可） |
| `setFacing(radians)` | モデルの向きを外部から設定（Y軸回転） |
| `forceAttack('cleave'\|'pulse'\|'ray')` | `seek` 状態で指定攻撃を開始。成功時true |
| `colliders` | 胴体のおおまかなカプセル形状の情報 |
| `weakPoint` | コアの大まかな位置、弱点が有効かどうか |
| `isAlive` | 撃破されていなければtrue |
| `dispose()` | ジオメトリ/マテリアル破棄、scene親から削除 |

### `update` に渡せるターゲット

優先順：`context.player.position` → `context.target.position` → `context.target` → `setTarget()` → 初期 `options.target`。

*注：自律的なプレイヤーHP減少処理はしない。攻撃命中時に `playerHit` を通知するだけ。最終的なHP・無敵時間・ゲームオーバーの決定は必ず統合側で行う。*

### 通知イベント (`options.onEvent(event)`)

| `type` | 主要フィールド | 用途 |
| --- | --- | --- |
| `telegraph` | `attack`, `label`, `duration` | 予兆開始時。UIや音声の表示に利用 |
| `attackImpact` | `attack`, `damage`, `hit`, `blocked`, `position`, `direction` | 予兆終了→攻撃成立の瞬間 |
| `playerHit` | `attack`, `damage`, `knockback`, `direction` | 攻撃がプレイヤーに命中、かつ無敵でない場合 |
| `enemyDamaged` | `damage`, `hp`, `weakness` | 敵の被弾 |
| `enemyStaggered` | `duration` | 体勢崩壊 |
| `phaseChanged` | `phase` | 第二形態に変化 |
| `enemyDefeated` | - | HP0 |
| `reset` | - | モジュール初期化 |

### 戦闘データと座標

- `cleave`: 前方扇形、半角0.64rad、約4.5m、威力24
- `pulse`: 半径3.34m、威力19、空中高度0.65m以上は回避扱い
- `ray`: 前方約11.7m、全幅約1.36m、威力28
- 予兆半ばで向きを固定。回避のために直前の方向転換をしない。
- 敵AIはターゲットに近づき、距離に応じて攻撃を選ぶ。攻撃後は硬直が生じる。
- 姿勢ゲージ100で約1.9秒の体勢崩壊。
- HP50%で第二形態、移動速度と予兆速度が変化。
- モデル原点 = 足元中心。正面 = ローカル前方-Z、Y上。

### 性能上の注意

モジュール本体はTexture、ShadowMap、ポストプロセス、外部アセットを一切必須としない。LOWは浮遊装飾などを非表示にする。統合側の描画距離・描画スケール・カリング等と合わせて測定すること。
