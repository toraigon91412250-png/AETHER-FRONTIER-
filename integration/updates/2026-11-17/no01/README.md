# No.00宛 | AETHER FRONTIER No.01 v1.1 統合方法

2026-11-17に`main`を参照。確認したファイル:
- `teams/01/src/aether-module.js` (Git blob `dc9ab210c38d60845ffe5f83b99573ec29dffccd`、33,839 bytes)
- `playtest/work20/world.js` (`createCity`, `ground`, `resolve`, `zoneAt`, `updateVisibility`)
- `playtest/work20/main.js` (`currentAction`, 歩行更新、`city.update`)
- `integration/aether-compat.mjs` (`getFloorHeight`ほかのAPI互換ラッパー)

## 一番小さい統合差分

1. `src/aether-walking-city.js` を統合プロジェクト内の `playtest/work20/modules/no01-walking-city.js` にコピー。ES moduleとしてそのまま利用可（原版import依存なし）。
2. `playtest/work20/world.js` 冒頭の既存 `createCity` import行の下に追加:

```js
import { enhanceCity } from './modules/no01-walking-city.js';
```

3. `createWorld(scene)` の次の既存行だけを変更:

```diff
- const city = createCity(THREE,{quality:'lite'});
+ const originalCity = createCity(THREE,{quality:'lite'});
+ const city = enhanceCity(THREE, originalCity, {quality:'lite'});
```

他のファイルの変更は基本不要。`city.root`は元ルートのまま、`city.update`、`city.setQuality`、`city.getFloorHeight`、`city.resolveHorizontal`、`city.getNearbyInteraction`、`city.interact`、`city.dispose` も従来どおり呼べるので、`world.ground()`と`world.resolve()`が自動的に段丘・橋・裏道も扱います。

**禁止:** `playtest/work20/modules/city.js`の元造形を上書きしないこと。中央の塔・3つの共鳴碑・4接続口を改変しないこと。

## No.00統合QAチェックリスト

- ① 中央南スタート `(3,0.42,-88)` が保持され、歩行可能。
- ② 飛行艇搭乗ポイント `(0,1.65,-114)`、起動リレー `(0,0.42,-102.5)`、北側空中島への道が保全されている。
- ③ 北/東/南/西4ゲートの通路が塞がれていない。
- ④ 原版の共鳴碑 `(0,81)`, `(-55,-35)`, `(55,-35)` および `(29.2,0)` 転移台の操作が維持。
- ⑤ 南東 `暁光の段丘`: `(30,.68,27)`の入口から `(85,8.55,38)`まで**徒歩で**到達できる。
- ⑥ 南西 `鏡界の空中橋`: `(-35,.68,22)`から `(-96,4.45,46)`まで徒歩で移動可能、地上から `(-78,.42,34)`付近の橋の下も通行できる。
- ⑦ 北西 `封印された裏道`: `(-37,.68,-49)`から `(-90,2.45,-88)`まで曲がり角を抜け、終点の記録を調べられる。
- ⑧ FPS/TPS・乗り物へ乗る/降りる・画質切替・飛行中の俯瞰での可視性・マップ外崖への衝突に回帰がない。
- ⑨ iPhone 16 Safariのライト版50fps以上という目標について、実機で測定して結果を記録。未達なら高品質装飾非表示とインスタンス描画回数の確認。

## 移動システムへの注意

統合側の`world.ground(x,z,feet)`は`city.getFloorHeight`を呼び、`world.resolve`は`city.resolveHorizontal`を呼びます。追加部の床高は現在の足元Yから最大+1.12m以内にある上側の面だけを返す仕様。これにより橋下の地上プレイヤーが橋上にワープすることを防ぎます。

もしNo.19のプレイヤー移動が`getGroundHeight`のサンプリングを低頻度で実施する場合、坂を高速移動したときだけ床面下を通る可能性があるので、地上移動のサブステップ幅や段差追従を調整してください。No.01単独ではNo.19のコントローラーを変更しません。

`enhanceCity`は元のNo.01ローカル座標系を前提とします。都市を別の原点に配置した場合、world.ground/world.resolveに渡す座標をモジュールrootローカルに変換してください。

## 永続セーブ（任意）

`enhanceCity`の戻り値 `city.walking`を使って次のように保持できます。

```js
// セーブ作成
saveData.no01Walking = city.walking.getState().discovered;
// ロード後
city.walking.setProgress(saveData.no01Walking || []);
```

最初は発見イベントの保存を省略しても、歩行と元の本編進行は問題なく動く設計です。
