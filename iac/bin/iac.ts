#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { FrontendStack } from '../lib/frontend-stack';
import { BackendSendJpkilambdaStack } from '../lib/backend-send-jpki-lambda-stack';
import { BackendNotifyLambdaStack } from '../lib/backend-notify-lambda-stack';
import { CommonInfraStack } from '../lib/common-infra-stack';

const app = new cdk.App();

// 共通インフラストラクチャスタックを作成
const commonInfraStack = new CommonInfraStack(app, 'CommonInfraStack', {});

// フロントエンドスタックを作成
new FrontendStack(app, 'FrontendStack', {});

// バックエンドスタック
// NAT Gateway（固定IP）から新規申請APIを叩くLambda関数
new BackendSendJpkilambdaStack(app, 'BackendSendJpkilambdaStack', {
  vpc: commonInfraStack.vpc,
  natGatewayEip: commonInfraStack.natGatewayEip,
});

// JPKIサーバーからWebhookをNLB（固定IP）で受ける
new BackendNotifyLambdaStack(app, 'BackendNotifyLambdaStack', {
  vpc: commonInfraStack.vpc,
  natGatewayEip: commonInfraStack.natGatewayEip,
});
