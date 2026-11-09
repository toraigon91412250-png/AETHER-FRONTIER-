# AETHER FRONTIER｜第2陣 10チーム納品完了

監査更新：2026-11-09（JST）

**第2陣10/10件のZIP原版を実際に受領して、CRC・JavaScript構文・共通APIを監査済み。** すべてZIP破損なし・構文エラーなし。詳細は [20チーム総合監査](FULL_AUDIT_2026-11-09.md)。GitHubには今回の監査文書のみ追加し、元のZIPや本編ゲームコードは変更していない。

| No. | 内容 | ZIP名 | ZIP/構文 | 付属独立テスト | 本編統合 |
|---|---|---|---|---|---|
| 04 | ASTRAEUM 星環神殿 | `AETHER_FRONTIER_No04_ASTRAEUM_Source(1).zip` | OK | なし | 未 |
| 05 | ERIDIAN-05 地下研究施設 | `AETHER_FRONTIER_No05_Integration(1).zip` | OK | PASS | 未 |
| 06 | THE AETHER FOUNDRY 工業プラント | `AETHER_FRONTIER_No06_Source(1).zip` | OK | PASS | 未 |
| 07 | STARVEIN WILDS 自然荒野 | `AETHER_FRONTIER_No07_Starvein_Wilds_SOURCE(1).zip` | OK | なし | 未 |
| 09 | ARK VESPER 巨大空中戦艦 | `AETHER_FRONTIER_No09_ARK_VESPER_SOURCE(1).zip` | OK | なし | 未 |
| 10 | ARCHAION X 変形ロボット | `AETHER_FRONTIER_No10_Source(1).zip` | OK | なし | 未 |
| 12 | RIFT HOUND ホバービークル | `AETHER_FRONTIER_No12_RiftHound_Source(1).zip` | OK | なし | 未 |
| 14 | VESTIGE-Ω 巨大守護ゴーレム | `AETHER_FRONTIER_No14_VESTIGE_OMEGA_source(1).zip` | OK | なし | 未 |
| 16 | AEGIS-IX 敵AI戦闘システム | `AETHER_FRONTIER_No16_Integration_v1.0(1).zip` | OK | PASS | 未 |
| 18 | ETHERWEAVE 空・天候 | `AETHER_FRONTIER_No18_ETHERWEAVE_v1_source(1).zip` | OK | なし | 未 |

## 第2陣ZIP原版 SHA-256

| No. | SHA-256 |
|---|---|
| 04 | `0dca563522a21126309e8cfa9d3282fcd969d19f601927e7b1d527a3513d2018` |
| 05 | `0352cbe531000e5afb2154f7497f40719a844d809964416dc588aace8eb00abf` |
| 06 | `a2a222d00b2d82e1c8c617b2485d416f2de774698e464c6d548cf605f7a8aeb1` |
| 07 | `6faed9730048af462dd27cff2e76031f3cf31b41f97ed8c79026d14184a8ec1c` |
| 09 | `00ba1dfec9ce7f1f7e411589f59ac66f77a01e5b3a619305a28bd77a64e24121` |
| 10 | `2a50dd8f5c667dbbb87d47ac87669d9f31e629d1f7d3fe7b7715ba943e0d3315` |
| 12 | `c0efdb2be37b767e0c9d0b7f0c88ab969bee94564948bb500e89bee198b2fba2` |
| 14 | `710dfea0239fecd7626b468d5553f35cc44aa492f7fc0a91532f0338b78eae09` |
| 16 | `39674a8b2e4dffa18c8aa7651db390f883770b7620fdd50072b8610d7e676699` |
| 18 | `cffde3d5f2c4f9ba8b69c648d8d139f9e65232272071b334f0e98f7b142f79fa` |

## 本編統合前の重点修正

- **画質モード**：No.04・05・14・16は`low/high`。No.17が送る`lite`を`low`へ変換。No.10は`lite/high`なので`lite`をそのまま渡す。
- **神殿の高さ処理**：No.04の`getFloorHeight`はrootのYオフセットを加算しない。`isBlocked`もY座標変換なし。空中・高台へ配置する場合は修正。
- **戦闘AI**：No.16はHP、被弾、予兆、第二形態を持つ。統合側のプレイヤーHPと敵撃破フラグはイベントを一本化。
- **空と天候**：No.18は新しいskyと雲海を描くため、既存skyとの二重描画を防止。デフォルト天空半径1600mに対して現行カメラfar=1450m（high）。
- **地形と移動**：No.07地面、No.09艦甲板、No.12乗り物をNo.19の衝突・操縦へ接続。
- **未検証**：単体WebGL実描画、iPhone 16実機fps、全20作品同時の入力・描画・セーブ・衝突。

**第2陣受領完了 ≠ 全20作品の本編統合完了。** 既存ゲームの`index.html`は変更しない。
