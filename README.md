# gen-visual-issue

GitHub Issue上でAI（Gemini画像生成API）を使って要件の図示化を行うGitHub Action

## 概要

GitHub Issueで **@gen-visual** にメンションして指示を出すと、Issue本文・コメントから要件を要約し、**コンセプト画像**や**ワイヤーフレーム画像**をGemini画像生成APIで生成して、Issueコメントとして貼り付けます。

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
          model-name: 'gemini-3-pro-image-preview'
          gcs-project-id: ${{ secrets.GCS_PROJECT_ID }}
          gcs-bucket-name: ${{ secrets.GCS_BUCKET_NAME }}
          gcs-service-account-key: ${{ secrets.GCS_SERVICE_ACCOUNT_KEY }}
          gcs-signed-url-expiry: '2592000'  # 30日（オプション）
```

### 2. シークレットの設定

リポジトリのSettings > Secrets and variables > Actionsで以下を設定：

- `AI_API_KEY` - Gemini APIキーなど（必須）
- `GCS_PROJECT_ID` - Google Cloud Storage プロジェクトID（必須）
- `GCS_BUCKET_NAME` - Google Cloud Storage バケット名（必須）
- `GCS_SERVICE_ACCOUNT_KEY` - Google Cloud Storage サービスアカウントキー（JSON文字列、必須）

#### GCSサービスアカウントキーの取得方法

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. IAM & Admin > Service Accounts に移動
3. サービスアカウントを作成または選択
4. Keys タブで新しいキーを作成（JSON形式）
5. ダウンロードしたJSONファイルの内容を `GCS_SERVICE_ACCOUNT_KEY` シークレットに設定

**注意**: サービスアカウントには以下の権限が必要です：
- Storage Object Creator（オブジェクトの作成）
- Storage Object Viewer（オブジェクトの読み取り、署名付きURL生成用）

### 3. 使い方

1. GitHub Issueを作成し、要件を記述
2. コメントで `@gen-visual wf` または `@gen-visual concept` とメンション
3. GitHub Actionが自動実行され、画像がコメントとして投稿される

## AIプロバイダの設定

現在サポートしているプロバイダ：

- `gemini` - Google Gemini 画像生成API（`gemini-3-pro-image-preview`モデル使用）

### 画像生成について

このアクションは、Geminiの画像生成モデル（`gemini-3-pro-image-preview`）を使用して、実際の画像を生成します。生成された画像は、Google Cloud Storage（GCS）にアップロードされ、推測不可能な署名付きURLが生成されてGitHub Issueコメントに貼り付けられます。

**注意**: 
- `gemini-3-pro-image-preview`モデルはプレビュー版のため、利用可能性や動作が変更される場合があります。Gemini APIキーに画像生成機能が有効になっていることを確認してください。
- 画像はGCSにアップロードされるため、GCSのストレージコストが発生する可能性があります。
- 署名付きURLの有効期限はデフォルトで30日間です（`gcs-signed-url-expiry`パラメータで変更可能）。

## 入力パラメータ

| パラメータ | 説明 | 必須 | デフォルト |
|----------|------|------|----------|
| `github-token` | GitHub API アクセストークン | はい | - |
| `ai-api-key` | AIプロバイダのAPIキー | はい | - |
| `ai-provider` | 使用するAIプロバイダ | いいえ | `gemini` |
| `model-name` | 使用するモデル名 | いいえ | `gemini-3-pro-image-preview` |
| `gcs-project-id` | Google Cloud Storage プロジェクトID | はい | - |
| `gcs-bucket-name` | Google Cloud Storage バケット名 | はい | - |
| `gcs-service-account-key` | GCSサービスアカウントキー（JSON文字列） | はい | - |
| `gcs-signed-url-expiry` | 署名付きURLの有効期限（秒） | いいえ | `2592000` (30日) |

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
export INPUT_GCS_PROJECT_ID=your_project_id
export INPUT_GCS_BUCKET_NAME=your_bucket_name
export INPUT_GCS_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
export INPUT_GCS_SIGNED_URL_EXPIRY=2592000
node dist/index.js
```

## ライセンス

MIT
