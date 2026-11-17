# No.16 AEGIS-IX v1.1 統合 API

**Three.js 0.160.0** / Y↑ / 前方ローカル -Z / 1単位≈1m。ビルド不要のES Module。

```js
import { createAetherModule } from './enemyModule.js';
const bot = createAetherModule(THREE, {
  position:{x:0,y:0,z:0}, maxHP:480, quality:'low',
  speedScale:1,
  ai:{engageRadius:21,dropRadius:25,leashRadius:26.4,turnRate:3.25,windupTurnRate:4.5,returnSpeed:3.9,loseDelay:.75},
  onEvent:e=>console.log(e)
});
scene.add(bot.root);
bot.update(deltaSeconds, {player:{position:{x:0,y:0,z:5},radius:.42,height:0,invulnerable:false}});
bot.receiveHit({damage:17,stagger:21});
```

## 既存API（変更なし）

| 名前 | 説明 |
|---|---|
| `root` | THREE.Group。モデル原点は足元、親ワールドへ追加可能 |
| `update(dt, context={})` | 秒単位dtでAI/アニメ/攻撃を更新。スナップショット返却。内部dt最大0.05秒 |
| `setQuality('low'/'high')` | LOD切り替え。戻り値はモード名 |
| `dispose()` | 全生成リソース破棄。複数回安全 |
| `receiveHit({damage,stagger,position})` | 受けるダメージ/体勢ダメージ。`{accepted,damage,weakness,...snapshot}` |
| `snapshot()` | HP、phase、state、positionなど。新たなフィールドが増えても従来フィールドを維持 |
| `reset({position?,facing?})` | **ホストから明示的に再戦させる**操作。HPと状態を初期化し、初期位置を帰還起点にする |
| `setTarget({x,y,z}|null)` | 自律ターゲットの固定/解除 |
| `setBehavior('aggressive'|'passive')` | 自動攻撃のON/OFF。passiveでも追跡は維持 |
| `setEnabled(bool)` | AIの状態時間進行・追跡を一時停止/再開 |
| `forceAttack('cleave'|'pulse'|'ray')` | seek中のみ強制攻撃。true/falseで開始成否 |
| `setFacing(yaw)` | 外部Y軸旋回ラジアン |
| `setPosition(x,y,z)` または `setPosition(Vector3)` | 外部移設。帰還起点も新位置へ変更 |
| `colliders` | 粗いカプセル当たり判定情報 |
| `weakPoint` | 弱点位置と有効状態（recover/stagger中） |
| `isAlive` | `dead`でfalse。明示的な`reset()`以外では復活しない |

### 新API

- `setHome({x,y?,z})` → boolean。帰還起点だけ更新。敵の現在位置やHPを変化させない。
- `snapshot().engaged` → boolean。現在のターゲットを追う状態。
- `snapshot().cooldown` → 次の自律攻撃までの残秒数。
- `snapshot().lastAttack` → 最後に開始した攻撃名。
- `snapshot().home` → 追跡帰還の起点ワールド位置。
- `snapshot().state` に `'return'` を追加。従来の `'seek'`, `'telegraph'`, `'active'`, `'recover'`, `'stagger'`, `'phaseShift'`, `'dead'` は維持。

### ターゲット解決と命中

`context.player.position` → `context.target.position` → `context.target` → `setTarget()` → `options.target` の優先順。`player.radius` は当たり判定半径、`player.height` は足元からの高さ（衝撃波をジャンプで回避）、`player.invulnerable` は無敵。モジュールはプレイヤーHPを直接減らさず、`playerHit` を通知する。

### 発火イベント

既存: `telegraph` (`attack,label,duration`)、`attackImpact` (`attack,damage,hit,blocked,position,direction`)、`playerHit` (`attack,damage,knockback,direction`)、`enemyDamaged`、`enemyStaggered`、`phaseChanged`、`enemyDefeated`、`reset`。

追加: `engaged`（追跡開始）、`leashReturn` (`reason:'lost-target'|'leash'|'no-target'|...`)、`returnedHome` (`reason`)。イベントは既存の `options.onEvent(event)` に送られる。新イベントは無視しても既存の呼び出しは壊れない。

### 調整値 (`options.ai`)

| 名称 | 既定値 | 用途 |
|---|---:|---|
| engageRadius | 21m | 初めて追跡を始める、起点からプレイヤーまでの距離 |
| dropRadius | 25m | 追跡中にプレイヤーを見失う距離 |
| leashRadius | 26.4m | 起点から敵本体が出られる最大半径。work20の31mチェックに収まる |
| turnRate | 3.25rad/s | 索敵・帰還中の旋回上限。第二形態で1.24倍 |
| windupTurnRate | 4.5rad/s | 予兆開始から46%までの追尾旋回上限。第二形態で1.12倍 |
| returnSpeed | 3.9m/s | 帰還速度。`speedScale`の影響を受ける |
| loseDelay | 0.75s | 見失い後に帰還状態へ移るまでの猶予 |

攻撃範囲は旧版互換: 斬撃4.5m・半角0.64rad、衝撃波半径3.34m（地上判定）、レーザー前方11.7m・幅1.36m。強制攻撃はターゲット無しでも完走する。予兆中は向きを徐々に合わせ、46%で固定。

状態遷移: `seek → telegraph → active → recover → seek`、`seek/telegraph/recover → return → seek`、`* → stagger → seek/return`、`* → phaseShift → seek/return`、`* → dead`。`dead` からは自動遷移しない。

**重要:** モジュールが自動で `reset()` を呼ぶことはない。`enemyDefeated` は戦闘一回につき一度だけ。撃破済みセーブ復元時の `reset()` 呼び出しはホストの責任で禁止すること。
