# AETHER FRONTIER｜第2陣 納品確認台帳

更新日：2026-11-09（JST）

## 現在の状況

第2陣10チームのうち、**6件のZIPを実際に受領・基本検査済み（05、06、07、09、10、12）**。さらにNo.14、16、18の**納品報告あり（ZIPはこのチャットに未添付のため検査待ち）**。完了報告は9/10チーム、ZIP検査は6/10。原版の改変・本編統合は実施していない。

| チーム | 作品 | 添付ZIP | ZIP | JS構文 | 付属テスト | 実機・本編統合 |
|---|---|---|---|---|---|---|
| 05 | ERIDIAN-05「無音の合唱室」／地下研究施設 | `AETHER_FRONTIER_No05_Integration(1).zip` | OK | OK | PASS（状態遷移・経路・封印等） | 未 |
| 06 | THE AETHER FOUNDRY／大型工業プラント | `AETHER_FRONTIER_No06_Source(1).zip` | OK | OK | PASS（装置・地面・コリジョン等） | 未 |
| 10 | ARCHAION X／人型⇄飛行型ロボット | `AETHER_FRONTIER_No10_Source(1).zip` | OK | OK | 付属なし（READMEに作成側のテスト報告あり） | 未 |
| 04 | 古代神殿 | - | 未 | - | - | - |
| 07 | STARVEIN WILDS／星脈の大地・自然荒野 | `AETHER_FRONTIER_No07_Starvein_Wilds_SOURCE(1).zip` | OK | OK | 付属なし | 未 |
| 09 | ARK VESPER／宵環級巨大空中戦艦 | `AETHER_FRONTIER_No09_ARK_VESPER_SOURCE(1).zip` | OK | OK | 付属なし | 未 |
| 12 | RIFT HOUND／RH-06ホバービークル | `AETHER_FRONTIER_No12_RiftHound_Source(1).zip` | OK | OK | 付属なし | 未 |
| 14 | 古代守護ゴーレム | - | 納品報告あり・ZIP未確認 | - | - | - |
| 16 | 敵AI・戦闘ロボット | - | 納品報告あり・ZIP未確認 | - | - | - |
| 18 | 空・雲・天候 | - | 納品報告あり・ZIP未確認 | - | - | - |

## ZIP原版の識別情報

| No. | ZIPサイズ | SHA-256 |
|---|---:|---|
| 05 | 32,658 bytes | `0352cbe531000e5afb2154f7497f40719a844d809964416dc588aace8eb00abf` |
| 06 | 43,644 bytes | `a2a222d00b2d82e1c8c617b2485d416f2de774698e464c6d548cf605f7a8aeb1` |
| 10 | 28,886 bytes | `2a50dd8f5c667dbbb87d47ac87669d9f31e629d1f7d3fe7b7715ba943e0d3315` |
| 07 | 48,802 bytes | `6faed9730048af462dd27cff2e76031f3cf31b41f97ed8c79026d14184a8ec1c` |
| 09 | 50,702 bytes | `00ba1dfec9ce7f1f7e411589f59ac66f77a01e5b3a619305a28bd77a64e24121` |
| 12 | 68,880 bytes | `c0efdb2be37b767e0c9d0b7f0c88ab969bee94564948bb500e89bee198b2fba2` |

## 個別メモ

### No.05 / 地下研究施設
- 研究区画、冷却弁 A→B、同調器 1→2→3、記憶結晶、封鎖隔壁、最深部の古代中枢を持つ探索ステージ。
- `createAetherModule(THREE, options)`と`root/update/setQuality/dispose`あり。ES Moduleで、主機能に他システムへの依存なし。
- `node module_smoke_test.mjs`を実行し、状態遷移、封鎖、探索経路、画質切替、disposeにPASS。
- `quality: 'low'|'high'`。本編No.17の`lite`は`low`に変換する必要あり。
- `isWalkable`・`interact`等はローカル座標前提。ワールド配置時は座標を逆変換。
- 世界設定上の地下深度1840mはワールド座標のY=-1840ではない。自由に移動できる施設モジュール。

### No.06 / 工業プラント
- 約92×100×30m。中央炉、2基のタービン、搬送機、プレス、クレーン、上階通路、コンソール4個を持つ。
- `createAetherModule(THREE, options)`と`root/update/setQuality/dispose`あり。
- `node tests/module_smoke.mjs`を実行し、更新、地面高、機器操作、品質変更、disposeにPASS。
- `quality: 'low'|'high'`。本編の`lite`を`low`に変換する。
- `navigation.sampleGround/collides`などはローカル座標。 `getNearestInteraction`はワールド座標を受け取り、rootの配置変更に対応。

### No.10 / 変形ロボット
- 約7mの人型と翼幅約11mの飛行形態。パーツの回転による連続変形、変形途中の停止、歩行・浮遊モーション。
- `createAetherModule(THREE, options)`と`root/update/setQuality/dispose`あり。ES Module。
- `transformTo('flight', 2.8)`, `transformTo('robot', 2.8)`, `setTransformProgress`, `setMotion`等を提供。
- `quality: 'lite'|'high'`で共通仕様に一致。
- ZIP同梱の独立自動テストはなし。JS構文とHTML内JS構文は検査済み。実機での変形過程確認は未実施。
- ロボット本体は移動・戦闘・操縦システムを含まない。統合側でNo.19等と接続する必要あり。

### No.07 / STARVEIN WILDS
- 約720m×720mの地表自然エリア。鏡湖、森林、断層、結晶、観測塔、古代石環を探索し、5つの記憶装置を起動する。
- `aether-nature.js`に独立モジュールAPI `root/update/setQuality/dispose`。地表高、橋面高度、探索装置の状態取得・保存も提供。
- 画質指定は`low/high`。地面・探索APIはモジュールローカル座標。統合先で位置変換とNo.19衝突判定が必要。
- ZIP整合性・JS構文検査はOK。独立Nodeテストは同梱なし。3D描画・実機fpsは未検証。

### No.09 / ARK VESPER
- 全長約392m、幅約220mの空中戦艦。主炉、推進機、格納庫シャッター、徒歩で探索できる甲板・格納庫がある。
- `src/aether-no09.js`が独立モジュール。甲板と格納庫向け `getWalkableSurfaces/sampleWalkable` 、可動機構の `setHangarOpen` 等を提供。
- 画質指定は`low/high`。歩行面はローカル座標。統合側の座標変換、空中艦への乗り降り導線の実装が必要。
- ZIP整合性・JS構文検査はOK。独立Nodeテストは同梱なし。3D描画・実機fpsは未検証。

### No.12 / RIFT HOUND
- 地上高速ビークル。ブースト、ドリフト、ジャンプ台、チェックポイント7個、エネルギー回収などの単体デモ。
- モデル `source/aether-vehicle.js` と操縦計算 `source/aether-driver.js` を分離。統合側から入力・地面高度を提供できる。
- 画質指定は`low/high`。No.19操作、路面・地形、乗降・カメラは別途結線が必要。
- ZIP整合性・JS構文検査はOK。独立Nodeテストは同梱なし。3D描画・実機fpsは未検証。

### No.14／16／18
- 完成・納品の報告は受領。**ファイル本体はこのチャット上では未受領のため、内容・ZIP整合性・共通APIは未検査**。
- 第2陣の残り未報告担当はNo.04。

## 今回の検査範囲
- No.05/06/10に加えて、No.07/09/12のZIPのCRC検査（`ZipFile.testzip()`）結果：問題なし。
- No.07/09/12の全外部JavaScriptを`node --check`で検査：構文エラーなし。No.05/06/10も既に基本検査済み。
- No.05/06の同梱smokeテスト実行：PASS。No.07/09/12は独立Nodeテスト同梱なし。
- **WebGL表示、iPhone Safariでのfps、実際の探索・変形・ゲーム本編への接続は未確認。**

## 今後の扱い
- 本番`index.html`や`playtest/combat-v0.2.html`を、今回の納品受領だけで上書きしない。
- No.05/06/07/09/10/12のZIP原版はチャット添付で受領。**GitHubには今回の台帳を保存したが、ZIP原版とそのソースは未登録。** No.14/16/18はZIP待ち。
- 第2陣全件受領・個別視覚評価後に、統合用配置・品質・衝突・ギミック接続を進める。
