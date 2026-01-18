# eidosai

GitHub Issue上でAI（Gemini画像生成API）を使って要件の図示化を行うGitHub Action

## 概要

GitHub Issueで **@eidosai** にメンションして指示を出すと、Issue本文・コメントから要件を要約し、**コンセプト画像**や**ワイヤーフレーム画像**をGemini画像生成APIで生成して、Issueコメントとして貼り付けます。

## コマンド

### 基本コマンド

- `@eidosai wf` - ワイヤーフレーム画像を生成（デフォルト: 4枚）
- `@eidosai concept` - コンセプト画像を生成（デフォルト: 2枚）
- `@eidosai modify` - 既存画面を参考に修正版を生成（デフォルト: 2枚）
- `@eidosai "説明文"` または `@eidosai custom "説明文"` - カスタム画像を生成（デフォルト: 2枚）

### オプション

- `--count` / `-c <数値>` - 画像生成枚数を指定（例: `@eidosai wf --count 6`）
- `--no-issue-body` - Issue本文をコンテキストから除外し、コメント本文のみを使用（例: `@eidosai wf --no-issue-body`）

複数のオプションを組み合わせて使用可能です（例: `@eidosai wf --count 6 --no-issue-body`）。

### 画面修正コマンド（modify）について

`@eidosai modify` は、既存の画面画像を参考にトンマナを揃えて修正版を生成します。コメント内の画像（Markdown形式 `![alt](url)`）を自動検出し、同じデザインスタイルを維持しながら修正します。画像がない場合は通常のデザイン指示に基づいて生成します。

## セットアップ

### 1. リポジトリにワークフローを追加

`.github/workflows/eidosai.yml`を作成：

```yaml
name: eidosai Action

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
  eidosai:
    runs-on: ubuntu-latest
    if: contains(github.event.comment.body, '@eidosai') || contains(github.event.issue.body, '@eidosai')
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Run eidosai Action
        uses: hosshan/eidosai@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          ai-api-key: ${{ secrets.EIDOSAI_AI_API_KEY }}
          ai-provider: 'gemini'
          model-name: 'gemini-3-pro-image-preview'
          gcs-project-id: ${{ vars.GCS_PROJECT_ID }}
          gcs-bucket-name: ${{ vars.GCS_BUCKET_NAME }}
          gcs-service-account-key: ${{ secrets.GCS_SERVICE_ACCOUNT_KEY }}
          gcs-signed-url-expiry: '2592000'  # 30日（オプション）
```

### 2. シークレットと変数の設定

リポジトリのSettings > Secrets and variables > Actionsで以下を設定：

#### Secrets（機密情報）

- `eidosai_AI_API_KEY` - Gemini APIキーなど（必須）
- `GCS_SERVICE_ACCOUNT_KEY` - Google Cloud Storage サービスアカウントキー（JSON文字列、必須）

#### Variables（非機密情報）

- `GCS_PROJECT_ID` - Google Cloud Storage プロジェクトID（必須）
- `GCS_BUCKET_NAME` - Google Cloud Storage バケット名（必須）

#### GCSサービスアカウントキーの取得方法

1. [Google Cloud Console](https://console.cloud.google.com/) > IAM & Admin > Service Accounts に移動
2. サービスアカウントを作成または選択
3. Keys タブで新しいキーを作成（JSON形式）
4. ダウンロードしたJSONファイルの内容を `GCS_SERVICE_ACCOUNT_KEY` シークレットに設定

**必要な権限**: `Storage Object Creator`、`Storage Object Viewer`

#### GCSバケットの設定

1. Cloud Storage > Buckets でバケットを作成
2. サービスアカウントに `roles/storage.objectCreator` と `roles/storage.objectViewer` を付与
3. （推奨）パブリックアクセスを無効化（署名付きURLを使用するため不要）
4. （オプション）ライフサイクルポリシーで古い画像を自動削除

### 3. 使い方

1. GitHub Issueを作成し、要件を記述
2. コメントで `@eidosai wf` または `@eidosai concept` とメンション
3. 画像がコメントとして自動投稿されます

## AIプロバイダの設定

現在サポートしているプロバイダ：

- `gemini` - Google Gemini 画像生成API（`gemini-3-pro-image-preview`モデル使用）

生成された画像はGoogle Cloud Storage（GCS）にアップロードされ、署名付きURLが生成されてGitHub Issueコメントに貼り付けられます。署名付きURLの有効期限はデフォルトで30日間です（`gcs-signed-url-expiry`パラメータで変更可能）。

## システムプロンプトのカスタマイズ

GitHub Actionsの入力パラメータを使用してシステムプロンプトをカスタマイズできます。

### カスタムプロンプトテンプレート

`system-prompt-wf`、`system-prompt-concept`、`system-prompt-custom`、`system-prompt-modify` パラメータで各画像タイプ用のプロンプトテンプレートを指定できます。

**使用可能なプレースホルダー**:
- `{{imageNumber}}` - 現在の画像番号（1から開始）
- `{{totalCount}}` - 生成する総画像数
- `{{aspect}}` - 現在のアスペクト
- `{{fullContext}}` - Issue本文とコメント本文の結合
- `{{customInstruction}}` - カスタム指示（customタイプの場合のみ）
- `{{commonContext}}` - 共通コンテキスト

### カスタムアスペクト

`system-prompt-wf-aspects` と `system-prompt-concept-aspects` パラメータで、各画像タイプ用のアスペクト（画像ごとの焦点）をカンマ区切りで指定できます。

例: `system-prompt-wf-aspects: "レイアウト構造,UIコンポーネント,ナビゲーション,インタラクション"`

### 共通コンテキスト

`system-prompt-common-context` パラメータで、すべての画像タイプで共通して使用するコンテキスト（サービスの概要、ブランドガイドライン、デザイン原則など）を指定できます。デフォルトでは各プロンプトの先頭に自動追加されます。カスタムテンプレートでは `{{commonContext}}` プレースホルダーで任意の位置に配置できます。

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
| `system-prompt-wf` | ワイヤーフレーム用システムプロンプトテンプレート | いいえ | - |
| `system-prompt-concept` | コンセプト用システムプロンプトテンプレート | いいえ | - |
| `system-prompt-custom` | カスタム用システムプロンプトテンプレート | いいえ | - |
| `system-prompt-modify` | 画面修正用システムプロンプトテンプレート | いいえ | - |
| `system-prompt-wf-aspects` | ワイヤーフレーム用アスペクト（カンマ区切り） | いいえ | - |
| `system-prompt-concept-aspects` | コンセプト用アスペクト（カンマ区切り） | いいえ | - |
| `system-prompt-common-context` | すべての画像タイプで共通して使用するコンテキスト | いいえ | - |

## AIに渡すコンテキスト

デフォルトでは以下のコンテキストが使用されます：
- Issueの本文
- @eidosaiをメンションしたコメントの全文
- カスタム画像生成の場合: 指定したカスタム指示
- 画面修正（modify）の場合: コメント内の画像（Markdown形式 `![alt](url)`）

`--no-issue-body` オプションを使用した場合、Issue本文は除外され、コメント本文のみが使用されます。

## 使用例

### 例1: ワイヤーフレーム生成

Issue本文:
```
ユーザーログイン機能を実装したい

## 要件
- メールアドレスとパスワードでログイン
- ログイン画面にはロゴとフォーム
- パスワードを忘れた場合のリンク
```

コメント: `@eidosai wf` または `@eidosai wf --count 6`

→ ログイン画面のワイヤーフレームが自動生成されます（デフォルト: 4枚）

### 例2: コンセプト画像生成

Issue本文:
```
ECサイトのトップページをリニューアル

## コンセプト
- モダンでミニマルなデザイン
- 商品画像を大きく見せる
```

コメント: `@eidosai concept` または `@eidosai concept --count 3`

→ トップページのコンセプト画像が自動生成されます（デフォルト: 2枚）

### 例3: カスタム画像生成

コメント: `@eidosai "モダンで親しみやすいアイコンデザイン、グラデーションを使用"`

→ Issue本文とカスタム指示に基づいた画像が自動生成されます（デフォルト: 2枚）

### 例4: 画面修正

コメント:
```
@eidosai modify

この画面に「保存」ボタンを追加してください。

![現在の画面](https://example.com/current-screen.png)
```

→ コメント内の画像を参考に、同じデザインスタイルを維持しながら修正版を生成します（デフォルト: 2枚）

**注意**: 画像はMarkdown形式 `![alt](url)` で記述してください。複数の画像がある場合、すべての画像が参考として使用されます。

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
