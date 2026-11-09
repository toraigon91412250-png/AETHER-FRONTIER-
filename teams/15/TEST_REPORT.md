# No.15 v1.0 検証結果

| チェック | 結果 |
|---|---|
| 統合用JSの構文解析（Node.js `--check`） | PASS |
| 単体HTML内部module scriptの構文解析 | PASS |
| `createAetherModule(THREE, options)`でのモデル生成 | PASS（Three.js API形状を模したモックによる実行） |
| 120フレームの`update(dt, context)`、charge更新 | PASS（モック） |
| rootの位置を外部から変更した後、内部アニメーションが保持 | PASS（モック） |
| `setForm('awakened')`とブレンド移行 | PASS（モック） |
| `playAction('pulse'/'slash')` | PASS（モック） |
| `setQuality`の切替・復帰 | PASS（モック） |
| `dispose()`の連続呼び出し | PASS（モック） |
| 描画オブジェクト数（可視Mesh/InstancedMesh） | 高品質114、軽量78（約32%減、モック集計） |
| 実ブラウザWebGL描画・見た目 | **未確認** |
| iPhone 16 Safariのfps実測 | **未実施** |
| デスクトップPCのfps実測 | **未実施** |

注意：可視オブジェクト数はドローコール・三角形数そのものではない。デモの実測表示を利用し、統合後に再評価すること。
