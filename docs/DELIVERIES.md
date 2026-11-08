# AETHER FRONTIER / 第1陣 納品管理（2026-11-08）

## 第1陣：全10チーム納品済み

以前の暫定台帳の「9件想定」を訂正。実際に第1陣へ割り当てた10チーム（01,02,03,08,11,13,15,17,19,20）が全員ZIPを納品し、受領数は **10/10**。

| No. | 内容／作品 | ZIPファイル名 | ZIP整合性 | 静的検査 | 独立Nodeテスト | 統合・実機fps |
|---|---|---|---|---|---|---|
| 01 | AETHER CROWN / 中央都市 | `AETHER_01_source_v1.0(1).zip` | OK | OK | PASS | 未 |
| 02 | LUMEN QUARTER / 街区 | `AETHER_FRONTIER_No02_LUMEN_QUARTER_v1.0.0(1).zip` | OK | OK | 付属なし | 未 |
| 03 | SKYWARD ARCHIPELAGO / 浮遊島 | `AETHER_FRONTIER_No03_Skyward_Archipelago_v1.0.0-source(1).zip` | OK | OK | PASS | 未 |
| 08 | LUMEN KESTREL / 飛行艇 | `AETHER_FRONTIER_No08_LUMEN_KESTREL_Source_v1.0(1).zip` | OK | OK | 付属なし | 未 |
| 11 | SERAPH-11 / ドローン | `AETHER_FRONTIER_No11_SERAPH_11_SOURCE_v1.0.0(1).zip` | OK | OK | PASS | 未 |
| 13 | VHALKOR / 機械竜 | `AETHER_FRONTIER_No13_VHALKOR_SOURCE(1).zip` | OK | OK | PASS | 未 |
| 15 | VESPER PRISM / ファンタジー装備 | `AETHER_15_VESPER_PRISM_source_v1.0(1).zip` | OK | OK | PASS | 未 |
| 17 | Performance Lab / 最適化 | `AETHER_No17_Source_v1.0(1).zip` | OK | OK | PASS | 未 |
| 19 | プレイヤー操作／FPS-TPS | `AETHER_FRONTIER_No19_Integration(1).zip` | OK | OK | PASS | 未 |
| 20 | MERIDIAN VAULT / 探索ギミック | `AETHER_FRONTIER_No20_SOURCE_v1.0(1).zip` | OK | OK | PASS | 未 |

- 10個のZIPに破損なし。
- 31件の外部JavaScriptファイルと21件のHTML埋め込みJavaScriptに対するNode構文検査でエラー0件。
- 独立Nodeスモークテストは8チームすべて PASS。No.02/08はテスト同梱なし。
- Three.js 0.160.0、Y-up、メインモジュールの共通4API、単体デモ・ソース納品条件をコード・READMEから確認。
- **実WebGL描画・統合シーン・iPhone 16 Safariでのfps測定は未実施。** 静的テストと実機性能は分けて管理。
- GitHubへ各ZIP原版のソース登録はまだ完了していない。現時点のGitHubに存在するのは管理文書。原版はチャット添付ZIPで保管。

## ZIP原版 SHA-256

| No. | SHA-256 |
|---|---|
| 01 | `579f696591490cc431018cbc07b8a012e467d211df33b0abca8c703918d39c18` |
| 02 | `47ecf15d09b686441d9ab36558942bb39cfd79e46cc6595a20222e37520adb26` |
| 03 | `5ff8c5ddb844fdd8e57fb7d33fade2df5564335f02de51fe99733a93d8e398e0` |
| 08 | `3eb481a22e2801a88dbb80b98cee7f2988fea5533a9542f45790955a88aeac4c` |
| 11 | `a2ab73f5262922ceebd1334bb6bf1829ea31a4cbfa76f5b05d196cd9f24059b3` |
| 13 | `ebb81e4f5f277aba1bf46013f99a25a1829928d84e4369c21451547118718a04` |
| 15 | `cb9f7a1e175b1da028dd97d9cf68a8d425decb009b356d18206fb398d51f69a3` |
| 17 | `14fff8bbf52236fd3aca34875b405b96cf43914fac7404b60e2b943879004255` |
| 19 | `1d8070773a6da7becdbe55916065e0c663c6a30794d3112c0d81e89d2c958f58` |
| 20 | `214d2912cd30cf642b555484416d03ebcd01c604774dcd0a66ed1a9785f0a415` |

次段階の互換性と性能上の課題： [統合準備判定](INTEGRATION_READINESS_2026-11-08.md)
