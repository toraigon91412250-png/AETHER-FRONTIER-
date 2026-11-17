# AETHER FRONTIER / No.00 第二陣統合 (2026-11-17)

## 対象
第1便4件、第2便8件、最終便5件、合計17件のZIPを受領。原版と同一だった11件は `teams/` に既に存在するため再コピーしない。
**実質更新はNo.01 / 10 / 11 / 13 / 16 / 18の6チーム**。
No.04 / 17 / 19 は今回の追加納品に含まれておらず、従来のオリジナル実装を維持する。

## 安全構成
- 旧 `teams/NN/`、従来 `index.html` は全て残す。新ソースは `integration/updates/2026-11-17/noNN/` にバージョン別保管。
- 共通の `integration/team-registry.mjs` はNo.10,11,16,18だけ新ソースへ切替。No.01,13の元ファクトリーはそのまま。
- `playtest/work20/world.js` はNo.01の徒歩拡張、No.11友好敵対ドローンv2を接続。No.13外装と騎乗は `playtest/work20/main.js`から追加する。
- No.10ロボットは `vehicles.js` の既存 `loadAetherCompat('10')` により新版を利用。
- No.16敵AIは `encounters.js` の `loadAetherCompat('16')`、No.18は `atmosphere.js` の `loadAetherCompat('18')` より新版を利用。
- No.13はボス撃破後のみ騎乗解放。人間/飛行艇/地上車の入力状態を共有しない。PCはE/F、iPhoneは既存「調べる」「着陸」とHUDの「降機」を使用。
- No.00保存ブランチの神殿・研究施設・工場の途中状態復元、リセット時の旧セーブ復活防止を取り込む。No.01徒歩探索の発見記録を新たな任意フィールドで保存。

## 検証
- 新ソースのNode構文検査、各更新の付属モック検査。リポジトリ内のテストは `node --test tests/wave-no*.mjs` を実行。
- No.13騎乗モジュール単体で `locked→mounting→ready→takeoff→flying→landing→ready→dismounting→grounded` を検証。実本編のカメラ操作・連続移動は別途実ブラウザ確認が必要。
- No.16死体復活、No.10変形、No.18天候は各チームのモック検査を実施。
- ZIP整合性検査は17件実施。最終便5件は全件元ZIPとSHA256一致。
- PCのリアルGPU／iPhone SafariによるFPSと表示品質の合格宣言は、実機テスト前には行わない。

## 未解決/確認が必要
1. 実機で「ボス撃破→騎乗→空中移動→着陸→降機→再騎乗」を一周する。No.13の飛行は内部で位置積分するため、旧LUMEN KESTREL飛行コントローラーとは併用しない。
2. DRAGONは高密度メッシュ。iPhone軽量モードでの大都市+天候同時描画は実測が必要。
3. No.01の高低差ルートではFPS/TPSの床高判定と乗り物衝突を実歩行で確認。
4. No.11、16の攻撃予兆はイベントとHP判定を本体が所有し、モジュール側で二重計算しない。
5. No.18のGLSL WebGLコンパイルと遠景雲の境界、霧/日照をPC/実機で確認。
6. レベル全域の連続プレイテストは今回の自動モック検査とは別。

## ロールバック
旧原版は `teams/` に不変で保持。各版更新の参照を差し戻すだけで、No.10/11/16/18の旧ファクトリーへ戻せる。No.01は `enhanceCity` を外してオリジナルを直接生成し、No.13は騎乗/外装の追加部分を取り除く。Gitの直前のmainコミットへ戻す場合は強制pushせず、新しい通常の復元コミットを作る。セーブキーは `aether-frontier-work20-v1` を維持。

## コマンド
```bash
node --test tests/wave-no13-riding.mjs tests/wave-no16-ai.test.mjs tests/wave-no18-atmosphere.test.mjs tests/wave-no10-transform.test.mjs
node --test integration/tests/compat.test.mjs tests/work20.test.mjs tests/work20-module-progress.test.mjs
```

## 関連
- `docs/WAVE_2026-11-17_MANIFEST.json` で全更新ZIPのSHA-256を記録。
- `docs/NO00_WORK20_STABILITY_2026-11-17.md` にセーブ復元の設計。
