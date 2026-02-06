# BlockAudio

Web Audio API をビジュアルなノードグラフで学べるインタラクティブなプレイグラウンドです。ブラウザ上でオーディオノードをドラッグ&ドロップで配置・接続し、リアルタイムに音を鳴らしながら Web Audio API の仕組みを体験できます。

## 特徴

- **ノードベースのビジュアルエディタ** - キャンバス上にノードを配置し、ポート同士をドラッグで接続
- **リアルタイム再生** - 再生ボタンを押すとすぐに音が鳴り、パラメータ変更が即座に反映
- **波形・スペクトラム表示** - AnalyserNode で音声信号をリアルタイムに可視化
- **コード生成** - 構築したグラフから等価な Web Audio API の JavaScript コードを自動生成
- **プリセット** - 段階的に学べるサンプルグラフを用意

## 対応ノード

| カテゴリ | ノード | 説明 |
|---------|--------|------|
| Source | Oscillator | 正弦波・矩形波・鋸歯状波・三角波の生成 |
| Effect | Gain | 音量の制御 |
| Effect | BiquadFilter | ローパス・ハイパスなど各種フィルタ |
| Effect | Delay | 音声の遅延（エコー構成に利用） |
| Effect | StereoPanner | 左右の定位制御 |
| Effect | DynamicsCompressor | ダイナミクスの圧縮 |
| Analysis | Analyser | 波形・スペクトラムの可視化 |
| Output | Destination | スピーカーへの最終出力 |

## プリセット

1. **はじめての音** - Oscillator → Destination の最小構成
2. **音量を操る** - GainNode で音量を制御
3. **波形を見る** - AnalyserNode で音声信号を可視化
4. **音色フィルタ** - BiquadFilterNode で倍音成分を加工
5. **エコーを作る** - DelayNode でフィードバックループを構成
6. **シンセサイザー** - 複数 Oscillator の加算合成
7. **ステレオ空間** - StereoPannerNode で左右定位を制御

## 開発

### セットアップ

```bash
npm install
```

### 開発サーバー

```bash
npm run dev
```

### ビルド

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## 技術スタック

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Web Audio API](https://developer.mozilla.org/ja/docs/Web/API/Web_Audio_API)
