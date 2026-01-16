# gen-visual-issue

GitHub Issue上でAI（Gemini Nanobananaなど）を使って要件の図示化を行うGitHub Action

## 概要

GitHub Issueで **@gen-visual** にメンションして指示を出すと、Issue本文・コメントから要件を要約し、**コンセプト画像**や**ワイヤーフレーム画像**を生成して、Issueコメントとして貼り付けます。

## コマンド

- `@gen-visual wf` - ワイヤーフレーム画像を生成（2-6枚）
- `@gen-visual concept` - コンセプト画像を生成（1-2枚）

## セットアップ

### 1. リポジトリにワークフローを追加

`.github/workflows/gen-visual.yml`を作成：

```yaml
name: Gen Visual Action

on:
  issue_comment:
    types: [created]
  issues:
    types: [opened, edited]

permissions:
  issues: write
  pull-requests: write
  contents: read

jobs:
  gen-visual:
    runs-on: ubuntu-latest
    if: contains(github.event.comment.body, '@gen-visual') || contains(github.event.issue.body, '@gen-visual')
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Run Gen Visual Action
        uses: hosshan/gen-visual-issue@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          ai-api-key: ${{ secrets.AI_API_KEY }}
          ai-provider: 'gemini'
          model-name: 'gemini-pro'
```

### 2. シークレットの設定

リポジトリのSettings > Secrets and variables > Actionsで以下を設定：

- `AI_API_KEY` - Gemini APIキーなど（必須）

### 3. 使い方

1. GitHub Issueを作成し、要件を記述
2. コメントで `@gen-visual wf` または `@gen-visual concept` とメンション
3. GitHub Actionが自動実行され、画像がコメントとして投稿される

## AIプロバイダの設定

現在サポートしているプロバイダ：

- `gemini` - Google Gemini API（デフォルト）

## 画像生成の拡張

現在の実装では、Gemini AIが画像の**説明文**を生成し、プレースホルダー画像URLを返します。

実際の画像生成を統合するには、`src/ai-provider.ts`の`generateImages`メソッドを拡張してください：

1. Gemini APIのレスポンスから画像の説明を解析
2. 説明を画像生成API（DALL-E、Stable Diffusion、Midjourneyなど）に送信
3. 生成された画像をホスティングサービス（GitHub Assets、Imgur、S3など）にアップロード
4. ホストされた画像のURLを返す

```typescript
// 例：DALL-E統合
const descriptions = parseDescriptions(text);
const images = await Promise.all(
  descriptions.map(desc => generateImageWithDALLE(desc))
);
return images.map(img => img.url);
```

## 入力パラメータ

| パラメータ | 説明 | 必須 | デフォルト |
|----------|------|------|----------|
| `github-token` | GitHub API アクセストークン | はい | - |
| `ai-api-key` | AIプロバイダのAPIキー | はい | - |
| `ai-provider` | 使用するAIプロバイダ | いいえ | `gemini` |
| `model-name` | 使用するモデル名 | いいえ | `gemini-pro` |

## AIに渡すコンテキスト

- Issueの本文
- @gen-visualをメンションしたコメントの全文

## 使用例

### 例1: ワイヤーフレーム生成

Issue本文:
```
ユーザーログイン機能を実装したい

## 要件
- メールアドレスとパスワードでログイン
- ログイン画面にはロゴとフォーム
- パスワードを忘れた場合のリンク
- 新規登録へのリンク
```

コメント:
```
@gen-visual wf
```

→ ログイン画面のワイヤーフレーム（2-6枚）が自動生成され、コメントで投稿されます

### 例2: コンセプト画像生成

Issue本文:
```
ECサイトのトップページをリニューアル

## コンセプト
- モダンでミニマルなデザイン
- 商品画像を大きく見せる
- シンプルなナビゲーション
```

コメント:
```
@gen-visual concept
```

→ トップページのコンセプト画像（1-2枚）が自動生成され、コメントで投稿されます

## 開発

### ビルド

```bash
npm install
npm run build
```

### ローカルテスト

環境変数を設定してテスト：

```bash
export INPUT_GITHUB_TOKEN=your_token
export INPUT_AI_API_KEY=your_api_key
export INPUT_AI_PROVIDER=gemini
node dist/index.js
```

## ライセンス

MIT
