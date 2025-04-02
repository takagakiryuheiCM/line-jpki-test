#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { FrontendStack } from '../lib/frontend-stack';
import { BackendSendJpkilambdaStack } from '../lib/backend-send-jpki-lambda-stack';
import { BackendNotifyLambdaStack } from '../lib/backend-notify-lambda-stack';

const app = new cdk.App();
new BackendNotifyLambdaStack(app, 'BackendNotifyLambdaStack', {});
new FrontendStack(app, 'FrontendStack', {});
new BackendSendJpkilambdaStack(app, 'BackendSendJpkilambdaStack', {});
