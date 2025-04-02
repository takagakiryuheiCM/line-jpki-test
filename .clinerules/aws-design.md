
以下のブログの内容を参考に、Lambdaから外部APIを固定IPで叩ける様にする。

• notifyUrl：Lambdaでエンドポイントを作成
• returnUrl
・サービス名
・サーバーのIP
1.Notify先IP :
2.APIを叩く貴社側の IP

① 当社からJPKIサーバーへリクエストを送信する際の固定IPは「VPC Lambda → NAT Gateway + EIP」
② JPKIサーバーからWebhookを受け取る際の固定IPは「NLB (EIP)→ ALB → Lambda」
という構成が必要で、それぞれ別のIPになるという認識ですかね