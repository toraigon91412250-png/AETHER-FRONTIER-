# 第1陣 納品管理 / 2026-11-08

第1陣は10チーム構想。ユーザーからの納品予定数は9件と指定されているため、最終集計は実際の納品数で判断する。

**受領確認: 7件**。すべてZIP構造検査を実施済み。No.15は付属Node.jsモックテストも今回実行して成功。受領と実機動作・ゲームへの組み込みは別段階。

| No. | 作品 | ZIP名 | 受領 | 統合 | 実機fps |
|---|---|---|---|---|---|
| 01 | AETHER CROWN / 中央都市 | `AETHER_01_source_v1.0(1).zip` | 済 | 未 | 未 |
| 02 | LUMEN QUARTER / 商業・居住地区 | `AETHER_FRONTIER_No02_LUMEN_QUARTER_v1.0.0(1).zip` | 済 | 未 | 未 |
| 03 | SKYWARD ARCHIPELAGO / 浮遊島群 | `AETHER_FRONTIER_No03_Skyward_Archipelago_v1.0.0-source(1).zip` | 済 | 未 | 未 |
| 08 | LUMEN KESTREL / 飛行艇 | `AETHER_FRONTIER_No08_LUMEN_KESTREL_Source_v1.0(1).zip` | 済 | 未 | 未 |
| 11 | SERAPH-11 / ドローン | `AETHER_FRONTIER_No11_SERAPH_11_SOURCE_v1.0.0(1).zip` | 済 | 未 | 未 |
| 13 | VHALKOR / 巨大機械竜 | `AETHER_FRONTIER_No13_VHALKOR_SOURCE(1).zip` | 済 | 未 | 未 |
| 15 | VESPER PRISM / 星環裂刃 | `AETHER_15_VESPER_PRISM_source_v1.0(1).zip` | 済 | 未 | 未 |
| 17 | 画質・最適化 | - | 未 | - | - |
| 19 | FPS/TPS操作 | - | 未 | - | - |
| 20 | 探索ギミック | - | 未 | - | - |

## ZIP原版 SHA-256（後続の複製検証用）

| No. | SHA-256 |
|---|---|
| 01 | `579f696591490cc431018cbc07b8a012e467d211df33b0abca8c703918d39c18` |
| 02 | `47ecf15d09b686441d9ab36558942bb39cfd79e46cc6595a20222e37520adb26` |
| 03 | `5ff8c5ddb844fdd8e57fb7d33fade2df5564335f02de51fe99733a93d8e398e0` |
| 08 | `3eb481a22e2801a88dbb80b98cee7f2988fea5533a9542f45790955a88aeac4c` |
| 11 | `a2ab73f5262922ceebd1334bb6bf1829ea31a4cbfa76f5b05d196cd9f24059b3` |
| 13 | `ebb81e4f5f277aba1bf46013f99a25a1829928d84e4369c21451547118718a04` |
| 15 | `cb9f7a1e175b1da028dd97d9cf68a8d425decb009b356d18206fb398d51f69a3` |

## 統合時の注意事項

- No.01: 中央都市の水平移動制限で、外周ゲートから隣接地区へ歩行移動できない可能性。外部エリア結合時に調整。
- No.15: `setQuality('low')` / `'high'` を使用。統合共通の `lite` と名前が違うのでアダプターで変換が必要。
- No.15: Node.js `qa/test_module.mjs` によるモック動作テスト PASS。可視オブジェクト数: high 114 / low 78。これはドローコールや実fpsを示す値ではない。
- この管理文書は受領台帳。ZIP原版のGitHub登録や変更・ゲーム統合を意味しない。
