# AETHER FRONTIER｜STEP 01：20モジュールの実ソース解析・接続地図

作成：2026-11-09｜No.00 総監督

## 目的と完了条件

既存本編には変更を加えず、原版ZIP 20件の**統合入口、主要な追加API、外部との依存関係、実装リスク**を明らかにする。今回すべてのZIPが `/mnt/data` に存在することを確認し、各原版の主JSファイルを開いてAPIを照合した。詳細なCRC・構文・付属テスト結果は [全20チーム総合監査](FULL_AUDIT_2026-11-09.md) を参照。

## 1. 本編の現在地

- GitHub `main/index.html` はv0.1.2、**1,582,030 bytesの単一HTML**。Three.js本体と先行10チームのロジックが同一`<script type="module">`に内包されている。
- 新10作品の独立ソースは現状GitHubの`teams/`等に未登録。`playtest/combat-v0.2.html`は別の戦闘試作版で、本番`index.html`を上書きしていない。
- 現行の中央都市・商業地区・浮遊島・飛行艇・ドローン・機械竜・魔導剣・FPS/TPS操作・最適化・探索ギミックを**残したまま、新10作品を追加する**のが次の基本方針。

## 2. 20件のソース入口と公開API（原版コードから確認）

| No. | 主ソース（ZIP内の相対パス） | 統合側が呼ぶ追加API／用途 | 接続区分 |
|---|---|---|---|
| 01 | `src/aether-module.js` | `getFloorHeight`, `resolveHorizontal`, `getNearbyInteraction`, `interact` | 都市・歩行・ギミック |
| 02 | `src/aether-district.js` | `getGroundHeight`, `resolveMovement`, `getNearestInteraction`, `interact` | 商業街・歩行 |
| 03 | `aether-sky-islands.js` | `sampleGround`, `resolveFootCollision`, `closestBeacon`, `activateBeacon`, `getUpdraft` | 浮島・飛行 |
| 04 | `aether-temple.js` | `getFloorHeight`, `isBlocked`, `nearest`, `interact`, `getSpawnPoint` | 神殿・歩行・封印 |
| 05 | `aether_no05_lab.js` | `isWalkable`, `getNearestInteractable`, `interact`, `getObjective`, `getSpawnPoint` | 地下施設・探索 |
| 06 | `src/aether_plant.js` | `navigation`, `getNearestInteraction`, `interact`, `getState` | 工業施設・足場・装置 |
| 07 | `aether-nature.js` | `terrainHeight`, `surfaceHeight`, `getNearby`, `interact`, `getState`, `loadState` | 地上の広域地形 |
| 08 | `src/ship.js`＋`src/flight-controller.js` | `setFlightState`, `anchors`／別クラス`AetherFlightController` | 飛行艇・操縦 |
| 09 | `src/aether-no09.js` | `getAnchors`, `getWalkableSurfaces`, `sampleWalkable`, `setHangarOpen` | 超巨大空中戦艦 |
| 10 | `src/aether_no10_robot.js` | `transformTo`, `setTransformProgress`, `setMotion`, `getState` | 変形ロボット |
| 11 | `src/aether-drone.js`＋`src/drone-pilot.js` | `setMode`, `setDeployment`, `triggerScan`／`createDronePilot` | 飛行ドローン |
| 12 | `source/aether-vehicle.js`＋`source/aether-driver.js` | `setDriveState`／`createGroundDriver`（操縦物理） | 地上乗り物・路面 |
| 13 | `src/aether-dragon.js` | `setPhase`, `anchors` | 巨大機械竜モデル |
| 14 | `aether-golem.js` | `setMotion`, `startAttack`, `receiveHit`, `getAttackSpec`, `getStatus` | ゴーレム演出／ボス |
| 15 | `aether15_weapon.js` | `setForm`, `setCharge`, `playAction`, `getState` | 剣モデル・アニメ |
| 16 | `enemyModule.js` | `receiveHit`, `snapshot`, `setTarget`, `setBehavior`, `forceAttack`, `reset` | 敵AI・HP・戦闘 |
| 17 | `aether-performance.js` | `registerClient`, `registerLOD`, `setAdaptive`, `getMetrics`, `beginFrame/endFrame` | 描画品質統括 |
| 18 | `aether-atmosphere.js` | `setWeather`, `setTimeOfDay`, `getLightingHint`, `setCloudSeaEnabled` | 空・時間・天候 |
| 19 | `src/aether-player-controller.js`＋`src/aether-input-adapter.js` | `teleport`, `setMode`, `setEnabled`, `getState`／`createAetherInputAdapter` | プレイヤー・入力 |
| 20 | `source/aether-interactions.js` | `findInteractable`, `interact`, `isWalkable`, `getColliders`, `getState/setState`, `consumeEvents` | パズル・保存 |

共通の4メソッド `root/update(dt,context)/setQuality(mode)/dispose()` は全チームの主モジュールに存在。ほぼ全主JSはES Moduleの`export function createAetherModule`形式だが、**No.04とNo.17はIIFEのグローバル公開形式**。各チームの主モジュールは外部のnpm依存ではなくホストから引き渡すThree.js名前空間を基本とする。No.08・11・12・19は操縦/入力用の補助ソースが別途必要。

## 3. 接続方式と責務の分離

**ワールド管理者：No.00**

- `scene`, `camera`, `renderer`, `clock`, `player.position`, `quality`, `save`, `damage`の最終的な所有者をNo.00に固定。
- `root.position`への配置と床・壁判定のローカル↔ワールド変換はホスト側の統合アダプターで行う。
- 画質指定は一律配信せず、**モジュール別マッピング**を登録。特に02/04/05/14/15/16では軽量指定`lite`を`low`へ変換。
- No.04/17のグローバル`createAetherModule`は同じ名前を使うため、**モジュール登録時に即座に別名で保持**し、後から同名で上書きしない。
- プレイヤー入力（No.19）からは`move/look/jump/dash/action/attack`等を統一して渡し、移動制御の二重更新を避ける。

**非描画のゲーム状態を統一**

- No.16が敵の内部HPと攻撃状態を管理。攻撃が実際に当たったかは`receiveHit`と`onEvent({type:'playerHit'...})`の契約を使う。プレイヤーHPを減らすのはホスト側だけ。
- No.14の`telegraphStart/impact`は演出イベント。本当の範囲判定やプレイヤーダメージはNo.00で処理する。
- No.07とNo.20は状態の読み書きAPIがあり保存と接続可能。No.05等、読み出しのみのものは原版側の保存設計を追加検討。
- No.18はカメラ位置を`update(dt,{camera})`で受け取り、`getLightingHint`で照明提案を返す。ホストのライト・fog設定と一致させる。

## 4. 初期の接続阻害要因

| 優先 | 問題 | 解析した根拠 | 次の対応 |
|---|---|---|---|
| P0 | 巨大単一HTMLに閉じた本編 | `index.html`約1.58MBにThree.jsと第1陣の統合コードが内包。原版はGitHubに未保管 | 後方互換を維持した原版管理＋ローダー設計 |
| P0 | 読み込み形式の不一致 | No.04／17はグローバルIIFE、他は主にESM | 名前空間アダプター |
| P0 | 画質名の不統一 | No.02/04/05/14/15/16が`low/high` | 個別`lite`→`low`変換 |
| P0 | 神殿の高さ判定 | No.04の床高はrootのYを加算せず、壁判定Yも未変換 | 床高＋Y補正テスト |
| P1 | 地形・艦・乗物が独立 | No.07の地面、No.09甲板、No.12ドライバーが別API | 進行方向の床高・衝突・乗降処理 |
| P1 | 敵システムの二重ダメージ | No.16の内部HPとNo.00の既存簡易戦闘が独立 | イベント／勝利フラグを統一 |
| P1 | 空の重複と描画距離 | No.18は独自sky、現行skyも存在。No.18標準半径1600m、現行カメラfar=1450m | No.18へ置換＋描画距離調整 |
| P1 | 飛行中の街の表示ポップ | 本編はエリア単位のvisible切替。v0.2は距離＋ヒステリシスの暫定修正 | 遠景プロキシ＋段階的LOD |
| P2 | 剣のアニメーション | v0.2ではモーションを暫定改善、厳密な剣先判定ではない | Workで本格調整を予定 |

## 5. 作業を細分化した実装順

- **STEP 01（今回）**：20ZIPの入口と公開API、読み込み形式、依存・リスクを可視化。✅
- STEP 02：共通接続規格（品質・座標・イベント・保存・リソース管理）を定義し、原版を変更せず通すアダプターを設計。
- STEP 03：20原版をバージョン固定でソース管理へ登録し、既存`index.html`を壊さない追加モジュール読み込み経路を用意。
- STEP 04：No.04/05/06/07の地上・施設探索エリアを小分けで統合し、徒歩とギミックの到達性をテスト。
- STEP 05：No.09/10/12の巨大艦・変形ロボット・地上車を乗り物と接続。
- STEP 06：No.14/16の戦闘とNo.13/15のドラゴン・剣の戦闘判定を接続。
- STEP 07：No.18の天候を既存空と差し替え、No.17で距離LOD・描画更新を制御。
- STEP 08：20作品統合プレイをPC/iPhoneで検証、進行・衝突・保存・P95/P99負荷・戦闘バランスを確認。

## このステップで変更していないもの

`index.html`、`playtest/combat-v0.2.html`、受領した20原版ZIP、本編のセーブデータ。**STEP 01は読取専用の解析**。この資料はAPI存在とコード読解に基づくものであり、20作品が同時に動作したことを意味しない。
