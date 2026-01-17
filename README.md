# eidosai

GitHub Issue上でAI（Gemini画像生成API）を使って要件の図示化を行うGitHub Action

## 概要

GitHub Issueで **@eidosai** にメンションして指示を出すと、Issue本文・コメントから要件を要約し、**コンセプト画像**や**ワイヤーフレーム画像**をGemini画像生成APIで生成して、Issueコメントとして貼り付けます。

## コマンド

### 基本コマンド

- `@eidosai wf` - ワイヤーフレーム画像を生成（デフォルト: 4枚）
- `@eidosai concept` - コンセプト画像を生成（デフォルト: 2枚）
- `@eidosai "説明文"` - カスタム画像を生成（テキスト指示に基づく、デフォルト: 2枚）
- `@eidosai custom "説明文"` - カスタム画像を生成（明示的な形式）
- `@eidosai modify` - 既存画面を参考に修正版を生成（デフォルト: 2枚）

### オプション

- `--count` / `-c <数値>` - 画像生成枚数を指定（例: `@eidosai wf --count 6`）
- `--no-issue-body` - Issue本文をコンテキストから除外し、コメント本文のみを使用（例: `@eidosai wf --no-issue-body`）

複数のオプションを組み合わせて使用可能です（例: `@eidosai wf --count 6 --no-issue-body`）。

### カスタム画像生成について

カスタム画像生成では、Issue本文とコメント本文に加えて、指定したテキスト指示をコンテキストとして使用します。これにより、conceptやwireframe以外の任意の画像生成が可能です。

### 画面修正コマンド（modify）について

`@eidosai modify` コマンドは、既存の画面画像を参考にトンマナ（トーン&マナー）を揃えて修正版を生成します。

- **画像がある場合**: コメント内の画像（Markdown形式 `![alt](url)`）を自動的に検出し、その画像を参考にして同じデザインスタイルを維持しながら修正を行います。
- **画像がない場合**: 通常のデザイン指示に基づいてUIデザインを生成します。

コメント内に画像を添付する場合は、Markdown形式で記述してください：
```
@eidosai modify

この画面に「保存」ボタンを追加してください。

![現在の画面](画像URL)
```

## セットアップ

### 1. リポジトリにワークフローを追加

`.github/workflows/eidosai.yml`を作成：

```yaml
name: Eidosai Action

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
        
      - name: Run Eidosai Action
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

- `EIDOSAI_AI_API_KEY` - Gemini APIキーなど（必須）
- `GCS_SERVICE_ACCOUNT_KEY` - Google Cloud Storage サービスアカウントキー（JSON文字列、必須）

#### Variables（非機密情報）

- `GCS_PROJECT_ID` - Google Cloud Storage プロジェクトID（必須）
- `GCS_BUCKET_NAME` - Google Cloud Storage バケット名（必須）

**注意**: 
- Secretsは機密情報（APIキー、認証情報など）に使用します
- Variablesは非機密情報（プロジェクトID、バケット名など）に使用します
- プロジェクトIDとバケット名は公開情報の可能性があるため、Variablesとして設定することを推奨します

#### GCSサービスアカウントキーの取得方法

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. IAM & Admin > Service Accounts に移動
3. サービスアカウントを作成または選択
4. Keys タブで新しいキーを作成（JSON形式）
5. ダウンロードしたJSONファイルの内容を `GCS_SERVICE_ACCOUNT_KEY` シークレットに設定

**注意**: サービスアカウントには以下の権限が必要です：
- Storage Object Creator（オブジェクトの作成）
- Storage Object Viewer（オブジェクトの読み取り、署名付きURL生成用）

#### GCSバケットの設定

1. **バケットの作成**
   - [Google Cloud Console](https://console.cloud.google.com/)にアクセス
   - Cloud Storage > Buckets に移動
   - 「バケットを作成」をクリック
   - バケット名を入力（グローバルで一意である必要があります）
   - リージョンを選択（推奨: 使用するリージョンに近い場所）
   - 「作成」をクリック

2. **サービスアカウントへの権限付与**
   - 作成したバケットを選択
   - 「権限」タブを開く
   - 「アクセス権を付与」をクリック
   - 新しいプリンシパルにサービスアカウントのメールアドレスを入力
   - ロールを選択：
     - `Storage Object Creator` - オブジェクトの作成に必要
     - `Storage Object Viewer` - オブジェクトの読み取りと署名付きURL生成に必要
   - 「保存」をクリック

   または、IAM & Admin > IAM からサービスアカウントに以下のロールを付与：
   - `roles/storage.objectCreator`
   - `roles/storage.objectViewer`

3. **バケットのアクセス制御設定（推奨）**
   - バケットの「権限」タブで、パブリックアクセスを無効にすることを推奨
   - 「パブリックアクセスを防止」を有効にする
   - 署名付きURLを使用するため、パブリックアクセスは不要です

4. **ライフサイクルポリシー（オプション）**
   古い画像を自動削除する場合は、ライフサイクルポリシーを設定：
   - バケットの「ライフサイクル」タブを開く
   - 「ルールを追加」をクリック
   - 条件を設定（例: 90日経過したオブジェクトを削除）
   - アクションを「削除」に設定
   - 「作成」をクリック

   **注意**: 署名付きURLの有効期限より長い期間を設定することを推奨します。

### 3. 使い方

1. GitHub Issueを作成し、要件を記述
2. コメントで `@eidosai wf` または `@eidosai concept` とメンション
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

## システムプロンプトのカスタマイズ

デフォルトのシステムプロンプトは、コード内で定義されていますが、GitHub Actionsの入力パラメータを使用してカスタマイズすることができます。

### カスタムプロンプトテンプレート

`system-prompt-wf`、`system-prompt-concept`、`system-prompt-custom` パラメータを使用して、各画像タイプ用のカスタムプロンプトテンプレートを指定できます。

テンプレート内では以下のプレースホルダーを使用できます：

- `{{imageNumber}}` - 現在の画像番号（1から開始）
- `{{totalCount}}` - 生成する総画像数
- `{{aspect}}` - 現在のアスペクト（aspects配列から取得）
- `{{fullContext}}` - Issue本文とコメント本文の結合（またはコメント本文のみ）
- `{{customInstruction}}` - カスタム指示（customタイプの場合のみ）
- `{{commonContext}}` - 共通コンテキスト（すべての画像タイプで使用可能）

### カスタムアスペクト

`system-prompt-wf-aspects` と `system-prompt-concept-aspects` パラメータを使用して、各画像タイプ用のアスペクト（画像ごとの焦点）をカスタマイズできます。

アスペクトはカンマ区切りで指定します。例：
- `system-prompt-wf-aspects: "レイアウト構造,UIコンポーネント,ナビゲーション,インタラクション"`
- `system-prompt-concept-aspects: "デザイン方向性,ビジュアルスタイル"`

### 共通コンテキスト

`system-prompt-common-context` パラメータを使用して、すべての画像タイプ（wf、concept、custom）で共通して使用するコンテキストを指定できます。

共通コンテキストには以下のような情報を含めることができます：

- サービスの概要や目的
- ブランドガイドライン
- デザイン原則
- ターゲットユーザー
- 技術的制約
- 既存のデザインシステムの情報

共通コンテキストは、デフォルトのプロンプトでは自動的に各プロンプトの先頭に追加されます。カスタムテンプレートを使用している場合、`{{commonContext}}` プレースホルダーを使用して任意の位置に配置できます。

### 使用例

ワークフローファイルでカスタムプロンプトを指定：

```yaml
- name: Run Eidosai Action
  uses: hosshan/eidosai@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    ai-api-key: ${{ secrets.EIDOSAI_AI_API_KEY }}
    ai-provider: 'gemini'
    model-name: 'gemini-3-pro-image-preview'
    gcs-project-id: ${{ vars.GCS_PROJECT_ID }}
    gcs-bucket-name: ${{ vars.GCS_BUCKET_NAME }}
    gcs-service-account-key: ${{ secrets.GCS_SERVICE_ACCOUNT_KEY }}
    system-prompt-wf: |
      Create a detailed wireframe ({{imageNumber}}/{{totalCount}}) showing {{aspect}}:
      
      {{fullContext}}
      
      Focus on {{aspect}} and ensure the wireframe is clear and well-structured.
    system-prompt-wf-aspects: "overall layout,component details,navigation,user interactions"
```

**注意**: 
- カスタムテンプレートが指定されていない場合、デフォルトのプロンプトが使用されます。
- カスタムアスペクトが指定されていない場合、デフォルトのアスペクトが使用されます。
- テンプレート内のプレースホルダーは実行時に自動的に置換されます。
- 共通コンテキストは、すべての画像タイプで自動的に使用されます。

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
- カスタム画像生成の場合: 上記に加えて、指定したカスタム指示（`customPrompt`）
- 画面修正（modify）の場合: 上記に加えて、コメント内の画像（Markdown形式 `![alt](url)` で記述された画像）

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
- 新規登録へのリンク
```

コメント:
```
@eidosai wf
```

または枚数を指定:
```
@eidosai wf --count 6
```

→ ログイン画面のワイヤーフレームが自動生成され、コメントで投稿されます（デフォルト: 4枚、指定時: 指定枚数）

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
@eidosai concept
```

または枚数を指定:
```
@eidosai concept --count 3
```

→ トップページのコンセプト画像が自動生成され、コメントで投稿されます（デフォルト: 2枚、指定時: 指定枚数）

### 例3: カスタム画像生成

Issue本文:
```
モバイルアプリのアイコンデザインを検討したい
```

コメント:
```
@eidosai "モダンで親しみやすいアイコンデザイン、グラデーションを使用"
```

または明示的な形式:
```
@eidosai custom "モダンで親しみやすいアイコンデザイン、グラデーションを使用"
```

または枚数を指定:
```
@eidosai "モダンで親しみやすいアイコンデザイン、グラデーションを使用" --count 5
```

→ Issue本文とカスタム指示に基づいた画像が自動生成され、コメントで投稿されます（デフォルト: 2枚、指定時: 指定枚数）

**注意**: カスタム画像生成では、Issue本文とコメント本文の両方に加えて、指定したカスタム指示がコンテキストとして使用されます。

### 例4: Issue本文を除外した画像生成

コメント本文のみを使用して画像生成を行いたい場合：

コメント:
```
@eidosai wf --no-issue-body
```

または複数のオプションを組み合わせ:
```
@eidosai "シンプルなログイン画面" --count 3 --no-issue-body
```

→ Issue本文を除外し、コメント本文のみをコンテキストとして使用して画像を生成します。

### 例5: カスタムシステムプロンプトの使用

ワークフローファイルでカスタムプロンプトを指定：

```yaml
- name: Run Eidosai Action
  uses: hosshan/eidosai@v1
  with:
    # ... 他の必須パラメータ ...
    system-prompt-concept: |
      Generate a professional concept visualization ({{imageNumber}}/{{totalCount}}) 
      that demonstrates {{aspect}} for the following requirements:
      
      {{fullContext}}
      
      The image should be high-quality and visually appealing, clearly showing {{aspect}}.
    system-prompt-concept-aspects: "design direction,visual style,branding elements"
```

→ カスタムプロンプトテンプレートとアスペクトを使用してコンセプト画像を生成します。

### 例6: 共通コンテキストの使用

ワークフローファイルで共通コンテキストを指定：

```yaml
- name: Run Eidosai Action
  uses: hosshan/eidosai@v1
  with:
    # ... 他の必須パラメータ ...
    system-prompt-common-context: |
      ## Service Overview
      This is an e-commerce platform for selling handmade products.
      
      ## Brand Guidelines
      - Color scheme: Warm earth tones
      - Typography: Sans-serif, modern
      - Style: Minimalist and clean
      
      ## Target Users
      - Age: 25-45
      - Interests: Handmade crafts, unique items
      - Tech-savvy but prefer simplicity
```

→ すべての画像生成（wf、concept、custom）で、共通コンテキストが自動的に各プロンプトの先頭に追加されます。これにより、サービスの概要やブランドガイドラインを毎回指定する必要がなくなり、一貫したコンテキストを提供できます。

### 例7: 画面修正（modify）コマンドの使用

既存の画面画像を参考に修正版を生成する場合：

コメント:
```
@eidosai modify

この画面に「保存」ボタンを追加してください。

![現在の画面](https://example.com/current-screen.png)
```

または枚数を指定:
```
@eidosai modify --count 3

ヘッダーにロゴを追加し、カラースキームを変更してください。

![現在の画面](https://example.com/current-screen.png)
```

→ コメント内の画像を自動的に検出し、その画像を参考にして同じデザインスタイルを維持しながら修正版を生成します。画像がない場合は、通常のデザイン指示に基づいてUIデザインを生成します（デフォルト: 2枚、指定時: 指定枚数）

**注意**: 
- 画像はMarkdown形式 `![alt](url)` で記述してください
- 画像URLはアクセス可能な公開URLである必要があります
- 複数の画像がある場合、すべての画像が参考として使用されます
- 画像のダウンロードに失敗した場合、警告を出してテキストプロンプトのみで生成を続行します

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
