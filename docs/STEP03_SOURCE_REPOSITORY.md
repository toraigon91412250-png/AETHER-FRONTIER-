# AETHER FRONTIER｜STEP 03 ソース登録・ロード検証

## 安全性
- **既存のroot `index.html`は一切変更・上書きせず保存**。
- 20チームのZIP内容は `teams/NN/`に、そのディレクトリ構成を維持して展開。
- `integration/`にはSTEP02の正規化ES Moduleと統合アダプターを追加し、原版を改変しない。
- `playtest/step03-imports.html`は、1つずつモジュールの読み込みと共通ファクトリ公開を検査。自動的に重い3Dモデルは生成しない。
- ソースの静的検査と実描画検査は別物。iPhone Safariでの実描画やfpsを保証しない。

## ローカルでのロード検証
`node tests/step03-import.test.mjs`（Node 22以上推奨）
`node --test integration/tests/compat.test.mjs`（STEP02既存自動テスト）
`python3 -m http.server 8803`、ブラウザで `http://localhost:8803/playtest/step03-imports.html` を開く。

## 各チームの原版ZIP

| No. | ZIP名 | テキストファイル数 | ソース内容の合計 |
|---|---|---:|---:|
| 01 | `AETHER_01_source_v1.0(1).zip` | 8 | 130,891 bytes |
| 02 | `AETHER_FRONTIER_No02_LUMEN_QUARTER_v1.0.0(1).zip` | 4 | 118,014 bytes |
| 03 | `AETHER_FRONTIER_No03_Skyward_Archipelago_v1.0.0-source(1).zip` | 7 | 149,720 bytes |
| 04 | `AETHER_FRONTIER_No04_ASTRAEUM_Source(1).zip` | 4 | 62,789 bytes |
| 05 | `AETHER_FRONTIER_No05_Integration(1).zip` | 5 | 82,219 bytes |
| 06 | `AETHER_FRONTIER_No06_Source(1).zip` | 6 | 112,662 bytes |
| 07 | `AETHER_FRONTIER_No07_Starvein_Wilds_SOURCE(1).zip` | 5 | 133,271 bytes |
| 08 | `AETHER_FRONTIER_No08_LUMEN_KESTREL_Source_v1.0(1).zip` | 7 | 129,645 bytes |
| 09 | `AETHER_FRONTIER_No09_ARK_VESPER_SOURCE(1).zip` | 5 | 136,260 bytes |
| 10 | `AETHER_FRONTIER_No10_Source(1).zip` | 4 | 73,069 bytes |
| 11 | `AETHER_FRONTIER_No11_SERAPH_11_SOURCE_v1.0.0(1).zip` | 15 | 275,632 bytes |
| 12 | `AETHER_FRONTIER_No12_RiftHound_Source(1).zip` | 8 | 192,699 bytes |
| 13 | `AETHER_FRONTIER_No13_VHALKOR_SOURCE(1).zip` | 6 | 83,089 bytes |
| 14 | `AETHER_FRONTIER_No14_VESTIGE_OMEGA_source(1).zip` | 3 | 73,708 bytes |
| 15 | `AETHER_15_VESPER_PRISM_source_v1.0(1).zip` | 6 | 100,621 bytes |
| 16 | `AETHER_FRONTIER_No16_Integration_v1.0(1).zip` | 7 | 141,501 bytes |
| 17 | `AETHER_No17_Source_v1.0(1).zip` | 5 | 89,468 bytes |
| 18 | `AETHER_FRONTIER_No18_ETHERWEAVE_v1_source(1).zip` | 4 | 77,092 bytes |
| 19 | `AETHER_FRONTIER_No19_Integration(1).zip` | 9 | 161,396 bytes |
| 20 | `AETHER_FRONTIER_No20_SOURCE_v1.0(1).zip` | 10 | 214,660 bytes |

## 統合に向けた次工程
- STEP04で各チームのrootをsceneへ配置する。既存のNo.01～20同一空間での表示・衝突・保存はまだ実装していない。
- No.04 / No.17: IIFEのグローバル公開は `integration/normalized` の別名ESMで隔離する。
- No.02: 原版のグローバル登録副作用を避け、`integration/normalized/no02-district.mjs` を使う。
- デモには外部CDNに依存するものがある。STEP03インポート検査はCDNに依存しない。
- レジストリの画質名変換はteam IDごとに行い、原版や既存セーブデータを変更しない。
