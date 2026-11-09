# AETHER FRONTIER｜第2陣 納品確認台帳

更新日：2026-11-09（JST）

## 現在の状況

第2陣10チームのうち、**No.05／No.06／No.10の3件を受領**。今回の確認対象はいずれも添付ZIP。ZIP原版の書き換え・本編への統合はしていない。

| チーム | 作品 | 添付ZIP | ZIP | JS構文 | 付属テスト | 実機・本編統合 |
|---|---|---|---|---|---|---|
| 05 | ERIDIAN-05「無音の合唱室」／地下研究施設 | `AETHER_FRONTIER_No05_Integration(1).zip` | OK | OK | PASS（状態遷移・経路・封印等） | 未 |
| 06 | THE AETHER FOUNDRY／大型工業プラント | `AETHER_FRONTIER_No06_Source(1).zip` | OK | OK | PASS（装置・地面・コリジョン等） | 未 |
| 10 | ARCHAION X／人型⇄飛行型ロボット | `AETHER_FRONTIER_No10_Source(1).zip` | OK | OK | 付属なし（READMEに作成側のテスト報告あり） | 未 |
| 04 | 古代神殿 | - | 未 | - | - | - |
| 07 | 自然・荒野 | - | 未 | - | - | - |
| 09 | 超巨大空中戦艦 | - | 未 | - | - | - |
| 12 | 地上用ホバービークル | - | 未 | - | - | - |
| 14 | 古代守護ゴーレム | - | 未 | - | - | - |
| 16 | 敵AI・戦闘ロボット | - | 未 | - | - | - |
| 18 | 空・雲・天候 | - | 未 | - | - | - |

## ZIP原版の識別情報

| No. | ZIPサイズ | SHA-256 |
|---|---:|---|
| 05 | 32,658 bytes | `0352cbe531000e5afb2154f7497f40719a844d809964416dc588aace8eb00abf` |
| 06 | 43,644 bytes | `a2a222d00b2d82e1c8c617b2485d416f2de774698e464c6d548cf605f7a8aeb1` |
| 10 | 28,886 bytes | `2a50dd8f5c667dbbb87d47ac87669d9f31e629d1f7d3fe7b7715ba943e0d3315` |

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

## 今回の検査範囲
- 3件のZIPのCRC検査（`ZipFile.testzip()`）結果：問題なし。
- すべての外部JS・`mjs`・HTML中のインラインJavaScriptを`node --check`で検査：構文エラーなし。
- No.05/06の同梱smokeテスト実行：PASS。
- **WebGL表示、iPhone Safariでのfps、実際の探索・変形・ゲーム本編への接続は未確認。**

## 今後の扱い
- 本番`index.html`や`playtest/combat-v0.2.html`を、今回の納品受領だけで上書きしない。
- ZIP原版はチャット添付で受領。**GitHubには今回の台帳を保存したが、ZIP原版とそのソースは未登録。**
- 第2陣全件受領・個別視覚評価後に、統合用配置・品質・衝突・ギミック接続を進める。
