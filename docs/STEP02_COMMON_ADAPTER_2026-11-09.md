# AETHER FRONTIER｜STEP 02 共通規格への修正 完了

作成日：2026-11-09 / No.00 統合本部

## 実装成果

**全20チームの原版を変更せずに、共通の呼び出し規格へ適合させる統合アダプターを実装済み。** 原版の互換性を壊さないため、独立した差分パッケージとして納品。**本番 `index.html` は変更していない。**

| 修正項目 | 結果 |
|---|---|
| 20チームの品質モード | `lite/high`へ統一し、モジュールに応じて`low/high`へ自動変換 |
| `update(dt,context)` | 更新dtの正規化、`context.quality`をネイティブ品質名に変換 |
| `dispose()` | 二重呼び出しを防止 |
| イベント | `teamId/type/payload/raw`へ統一、元の`onEvent`も保持 |
| 座標変換 | `toLocal`, `toWorld`, `sampleGroundWorld`, `isBlockedWorld`, `getSpawnWorld` |
| ギミック | 04/05/06/07の近傍検索と操作位置をワールド座標へ変換 |
| No.04神殿 | 床高のY補正と壁判定Yのローカル変換 |
| No.02 | `window.createAetherModule` のグローバル登録を外す正規化コピー |
| No.04・17 | IIFEの`createAetherModule`公開を隔離してES Module化 |
| 原版の追跡 | 20主ソースのSHA-256を一覧化 |

### 補正前に問題になった具体例

No.04で神殿を`root.position.y=52`に置くと、原版の`getFloorHeight`は神殿内ローカル床Y=2を返すため、ホストがそのまま使うと床をY=2と誤認する。アダプターの`sampleGroundWorld`は**世界座標Y=54**を返す。`isBlockedWorld`も同様にYをローカル座標へ変換する。

画質名は`lite`をそのまま全員に渡す方式ではなく、**No.01/10/17/18のみ`lite`、残る16チームには`low`**を使う。これは各主JSの`setQuality`の実装を再確認した結果。

## 配布パッケージ構成

`AETHER_FRONTIER_STEP02_COMPAT_2026-11-09.zip`（No.00からのチャット添付）

```text
README.md
docs/STEP02_VALIDATION.md
docs/SOURCE_SHA256.csv
integration/aether-compat.mjs
integration/team-registry.mjs
integration/normalized/no02-district.mjs
integration/normalized/no04-temple.mjs
integration/normalized/no17-performance.mjs
integration/tests/compat.test.mjs
```

- ZIP SHA-256：`e04a9c85ba0790bbfe8c5d1076d6ec76178f2f79dbf94ec8f265a3909ebdcb20`
- ZIPファイル数：9。ZIP整合性チェック：合格。
- Node v22で `node --test integration/tests/compat.test.mjs`：**7件のテストすべて合格**。
- アダプター、レジストリ、正規化3ソースに`node --check`：構文チェック合格。
- 使用例と制約はパッケージ`README.md`、`docs/STEP02_VALIDATION.md`に収録。

## STEP 02の範囲外（重要）

- 原版20件のGitHub `teams/NN` 配下への登録、`index.html`への本接続は**STEP 03以降**。
- No.20固有のレイキャスト操作、No.16敵AI、No.18天候などは`adapter.instance`の専用APIを呼ぶ。
- 回転した巨大ステージ、動く空中戦艦の相対移動、乗降判定などの本編物理はホスト側の追加実装が必要。
- 今回の7テストはNode上の共通アダプター単体テストであり、実Three.jsのWebGL画面やiPhone実測の成功を意味しない。

## 次工程

[STEP 01 ソース地図](STEP01_SOURCE_MAP_2026-11-09.md) → **STEP 02（完了）** → STEP 03（原版20件を分離したソース管理に登録・ロード検証） → STEP 04（神殿・地下・工場・荒野を接続）。

公開済みの本編 `index.html` とプレイテスト `playtest/combat-v0.2.html` はそのまま保持。
