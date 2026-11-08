# AETHER FRONTIER

20 AI共同開発計画 / No.00 統合本部

科学技術と古代魔法が融合する中規模・高密度のブラウザ3Dアクションゲーム。Three.js 0.160.0。FPS/TPS切替、探索、リアルタイム戦闘、飛行艇、ギミックを備える。

## 運用方針

- 第1陣は先行制作・単体試作。納品物は**原版を保存**し、統合版とは分離する。
- 作品のデザインは各チームに任せ、互換性・ゲームとしての動作・軽量化はNo.00で管理。
- 標準インターフェース: `createAetherModule(THREE, options)` -> `root`, `update(dt, context)`, `setQuality(mode)`, `dispose()`。
- 世界座標はY上、前方-Z、1単位約1m。
- 軽量モードはiPhone 16 Safariで通常60fps、重い場面でも50fps以上を目標。高品質版は50fps目標・画質優先。
- FPSや表示品質は**実機で測定するまで未合格**。静的検査の合格と実機描画の合格は別。
- Cloudflare Pages直接アップロード想定。ビルド工程を必須としない。
- 納品ごとにバージョンを保持し、過去の原版を上書きしない。

## リポジトリ構成（予定）

```text
teams/         各チームの未改変原版（No01 / No02 / ...）
integration/   統合アダプター、ワールド結合コード
qa/            検査記録、軽量化・実機検証の記録
docs/          仕様、納品管理、変更履歴
index.html     Cloudflare Pages公開用（統合テスト合格後）
```

**進捗表:** [docs/DELIVERIES.md](docs/DELIVERIES.md)

> 2026-11-08 初期化時点。各ZIPはChatGPTのNo.00チャットで受領済みだが、GitHubへの原版ソース登録やゲーム統合の完了とは区別する。
