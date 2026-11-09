# 検証レポート / 2026-11-08

## 実施済み

- `node --check`: `src/aether-drone.js` / `src/drone-pilot.js` / `src/demo-app.js` の構文検査、正常終了。
- `node tests/module-smoke.mjs`: WebGL不要のThree名前空間モックでモデル生成に成功（94ノードを確認）。
- 450フレームの巡航更新、手動操縦、友好→敵対の状態遷移、装甲翼展開率の追従、軽量/高品質切り替え、探査パルス終了処理、`dispose()`および解放後の`update()`無害化を確認。
- Chromium / Playwright: JS実行を切り離した**画面レイアウト**のオフライン確認。1440×900、390×844、375×667でボタン計9個が画面外にはみ出さないことを検査。
- 単体HTMLの生成処理により、ファイルごとに自作ソースとCSSが完全にインラインであることを確認。

## 未検証

- WebGLでの実際のレンダリング成功、見た目、Three.js実ライブラリによる描画テスト。検証環境から外部CDNへアクセスできないため未確認。
- iPhone 16 Safari上の表示、タッチ操作の実機試験、fps実測、およびCloudflare Pagesへのアップロード後の再生確認。
- 他チームのステージを併用したときのGPU負荷、メモリ、遠距離LOD、当たり判定、ゲーム本編のフレームレート。

**性能目標**: プロジェクト規定の軽量版60fps志向・最低50fps合格目標、高品質版50fps目標に沿うようモードを設計したが、ここでは実測値/保証として扱わない。

## 再現コマンド

```bash
# 必要: Node.js 22+（ただしゲームの実行には不要）
node --check src/aether-drone.js
node --check src/drone-pilot.js
node --check src/demo-app.js
node tests/module-smoke.mjs
```

実機でのfpsは右側テレメトリーの **FPS (LIVE)** に表示される。モードを変え、移動や探査を繰り返して最低値やカクつきを確認する。
