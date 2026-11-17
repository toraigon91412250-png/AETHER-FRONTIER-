# No.11 SERAPH-11 v2 / 統合ガイド

## 1. 互換性最優先の構造

- `aether-drone-core.js`: 元のv1.0.0（GitHub blob SHA: `95e377abc6d53936af9fe9a6909d3a97525b0908`）とバイト単位で一致。
- `aether-drone.js`: v2入口。内部で旧ファクトリーを作成し、元の `root` をそのまま返す。既存の `root/update/setQuality/dispose` と `setMode/setDeployment/triggerScan/getState` を保つ。
- `seraph-motion.js`: 内部任意モーション制御。初期は `external`、位置を絶対に更新しない。`motionMode:'follow'|'hold'` を明示して初めて座標変更を許す。
- 描画用の小さなフィードバック群だけrootに追加。既存の翼・結晶・魔法環のメッシュ/アニメーションは変更していない。
- 正面ローカル `-Z`、上 `+Y`、1単位約1メートル。独立したカメラ・レンダラー・scene・HP・AI・入力イベントは作らない。

## 2. 新規API

| 呼び出し | 役割 |
| --- | --- |
| `setMode('friendly'|'neutral'|'hostile')` | 旧API維持。発光切替、`modeChanged` 通知。敵対から離れた際は警告中断 |
| `setSignal('normal'|'tracking'|'caution'|'disabled')` | UI向け視覚状態。HP管理はしない |
| `setMotionMode('external'|'follow'|'hold')` | `external` = 位置変更なし。`follow` = 追従、`hold` = 追従せず明示的回避のみ移動 |
| `setFollowTarget({x,y,z}, yaw=0)` | ワールド座標のプレイヤー位置とY軸向き（ラジアン）を指定。`follow` の場合のみ移動 |
| `triggerScan({requestId?})` | 旧API（引数なし）も有効。1.55秒の探索光演出、イベント通知 |
| `dispatchScanEvent({type:'start',requestId?})` | ホストからのスキャン指令 |
| `dispatchScanEvent({type:'found',id,label?,position,duration?})` | ホストが発見した対象を表示。**判定は実装しない** |
| `dispatchScanEvent({type:'clear'|'complete'})` | 発見マーカー消去/スキャン完了応答通知 |
| `reportDiscovery({id,position:{x,y,z},duration?,label?})` | 同上。`position` は世界座標。表示は0.4〜15秒 |
| `clearDiscovery()` / `setTarget(position)` | 発見表示消去 / 次のマーカーのワールド位置だけ設定 |
| `triggerWarning({duration=1.2})` | 敵対 + disabled以外で警告動作。0.4〜3秒。攻撃は起こさない |
| `triggerEvade({direction:{x,y,z},distance=1.6,duration=.38})` | 0.18〜0.75秒の回避姿勢。`external`では演出のみ、他では短距離移動 |
| `getState()` | 既存フィールドと `signal,motionMode,warningActive,evading,discoveryActive,discoveredId,scanFeedbackActive,hasFollowTarget` |
| `drainEvents()` | 最大32件の一時イベントキューを取り出して空にする |
| `update(dt, context={})` | 旧形式維持。追加で `mode,quality,signal,motionMode,followTarget,playerYaw,scanEvent` を受け取る |
| `dispose()` | 子のフィードバックメッシュも含めてジオメトリ・材質を解放 |

### イベント

`onEvent({type,teamId:'11',source:'SERAPH-11',mode,time,...})` に通知。キューは最大32件、超過時は古い順に破棄。

`modeChanged`,`signalChanged`,`motionModeChanged`,`scanStarted`,`scanVisualComplete`,`scanAcknowledged`,`targetDiscovered`,`discoveryVisualComplete`,`warningStart`,`warningComplete`,`warningCancelled`,`evadeStart`,`evadeComplete`。

`warningComplete` は外部戦闘AI向けの**予兆終了通知**に過ぎず、攻撃開始・射程・判定・ダメージを自動実行しない。`evadeStart` は `movementApplied` と `visualOnly` を持つ。`targetDiscovered` は本編から入力されたIDと位置を返すだけで、内部でスキャン判定しない。`options.onEvent` が失敗した場合はゲームループ停止を避けるため無視し、必要なら `onCallbackError(error,event)` で診断可能。

### 移動と衝突

```js
const drone = createAetherModule(THREE, {
  quality:'low', mode:'friendly', motionMode:'external',
  followOffset:{x:-1.6,y:1.8,z:1.45}, maxSpeed:4.4,
  // 以下は任意。root.parent のローカル空間で提案座標を受け取り、
  // 衝突がある場合は補正した Vector3 を返す。
  resolveMovement(proposed, previous, {dt,mode,root}) {
    return collisionSystem.resolveDrone(previous, proposed);
  },
  onEvent: e => gameEvents.enqueue(e)
});
scene.add(drone.root);
drone.setMotionMode('follow');
// player.position はワールド座標（親グループが回転/移動していても親ローカルへ変換）
drone.update(dt, {followTarget:player.position,playerYaw:player.rotation.y,quality:'lite'});
```

`external` ではゲームホストが従来どおり `root.position` を動かせる。衝突コールバックが指定されなかった場合は壁を透過する可能性があるため、**本編投入時はホストの衝突解決処理を渡すか、移動を外部で管理**すること。`triggerEvade` の方向ベクトルはroot親のローカル座標で入力。`setMotionMode('hold')` は位置を維持し、要求された回避だけ行う。

## 3. No.00への実装依頼（このZIPでは実施しない）

**既存リポジトリを2026-11-17に読取確認:**

- `integration/team-registry.mjs` のNo.11エントリは `teams/11/src/aether-drone.js`。
- `integration/aether-compat.mjs` は `createAetherModule()` と `root/update/setQuality/dispose` を要求する。v2は適合。
- `playtest/work20/world.js` は `./modules/drone.js` を直接import。`playtest/work20/modules/drone.js` と `teams/11/src/aether-drone.js` はどちらもv1原版。
- `playtest/work20/main.js` はドローン位置・HP/攻撃・スキャン間隔・描画可否を本体で管理。これらにNo.11が割り込んではいけない。
- No.16 `playtest/work20/encounters.js` 側はNo.16独自の敵イベント・HPを統合。No.11の装飾的イベントをこの管理系へ自動混入させない。

**反映案A:** `teams/11/src/` の3ファイルをv2の同名ファイルで更新（既存 `drone-pilot.js` はそのまま）。`integration/team-registry.mjs` 側は変更不要。共通アダプター経由で新機能を利用可能。

**反映案B:** 現行 `work20` にも導入する場合は、No.00が `playtest/work20/modules/drone.js` を本ZIPの `src/aether-drone.js` の内容に差し替え、`aether-drone-core.js` と `seraph-motion.js` を同じ `playtest/work20/modules/` に追加する。既存の `world.js` importはそのまま使用できる。**No.11側では変更しない。**

**推奨:** 本編の既存敵対SERAPHインスタンスは引き続き `external` のまま運用。既存のHP・ダメージ判定は現行本編が所有する。必要な際に `drone.triggerWarning()` や `drone.triggerEvade()` を呼ぶ。追従型を出す場合は別インスタンスを `follow` で生成し、味方用の目標だけ渡す。戦闘AIや攻撃判定はNo.16と既存本編が引き続き担当する。

## 4. 低負荷のための条件

- v1本体は低描画時に高品質装飾を非表示。v2追加メッシュも警告/回避/発見時以外は非表示、追加フィードバックの高品質部分は `high` のときのみ。
- `external` では座標変更処理を行わず、過剰な状態遷移やイベントを生成しない。
- バッファ・ジオメトリを毎フレーム再生成しない。スキャン・警告は経過時間ベースで制限。
- `onEvent` の結果はキュー最大32件。ゲーム内で数十体表示する場合はカリング/更新間引きを本編側で行うこと。
- **FPSは未実測。** iPhone Safari / No.16との同時描画テストはNo.00側で最終判断すること。

## 5. 未解決/本編側で決めること

1. 敵AIとNo.11警告の時間連携。No.16が攻撃開始する際のアニメーション合わせは本編責務。
2. 発見IDの意味・発見判定・セーブ。No.11は視覚マーカーしか持たない。
3. 追従の衝突、マップ境界、通行不能・床の高さ。ルート選択は本編責務。
4. iPhone 16 SafariにおけるWebGL負荷・品質設定と同時敵数の実測。
