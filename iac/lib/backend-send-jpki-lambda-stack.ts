import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

// ① 当社からJPKIサーバーへリクエストを送信する際の固定IPは「VPC Lambda → NAT Gateway + EIP」
// JPKIサーバーに新規申請APIを叩くLambda関数
export class BackendSendJpkilambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPCの作成
    const vpc = new ec2.Vpc(this, 'JpkiVpc', {
      maxAzs: 1, // アベイラビリティーゾーンの数
      natGateways: 1, // NAT Gatewayの数
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        }
      ],
    });

    // Lambda関数のセキュリティグループを作成
    const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'JpkiLambdaSecurityGroup', {
      vpc,
      description: 'Security group for JPKI Lambda function',
      allowAllOutbound: true, // 外部へのアウトバウンドトラフィックを許可
    });

    // Lambda関数の実行ロールを作成
    const lambdaRole = new iam.Role(this, 'JpkiLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Lambda関数を作成
    const sendJpkiLambda = new NodejsFunction(this, 'SendJpkiLambda', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: 'handler',
      entry: '../backend/handler/send.ts',
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, // プライベートサブネットに配置
      },
      securityGroups: [lambdaSecurityGroup],
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      environment: {
        JPKI_API_ENDPOINT: 'https://kyc-digital-id-external-gw.line-beta.me', // 環境変数を設定
      }
    });

    // NAT GatewayのEIPを取得（CDKが自動的に作成したもの）
    const natGatewayEip = vpc.publicSubnets[0].node.findChild('EIP') as ec2.CfnEIP;

    // API Gatewayの作成
    const api = new apigateway.RestApi(this, 'JpkiApi', {
      restApiName: 'JPKI Service API',
      description: 'API for JPKI service integration',
      // API Gatewayのデプロイ設定
      deployOptions: {
        stageName: 'prod',
        // ログ設定を無効化（CloudWatch Logs role ARNが設定されていないため）
        // loggingLevel: apigateway.MethodLoggingLevel.INFO,
        // dataTraceEnabled: true,
      },
    });

    // Lambda関数とAPI Gatewayの統合
    const jpkiIntegration = new apigateway.LambdaIntegration(sendJpkiLambda, {
      proxy: true, // プロキシ統合を使用
    });

    // APIリソースとメソッドの作成
    const jpkiResource = api.root.addResource('jpki');
    jpkiResource.addMethod('POST', jpkiIntegration); // POSTメソッドを追加

    // 出力値の設定
    new cdk.CfnOutput(this, 'VpcId', {
      value: vpc.vpcId,
      description: 'VPC ID',
    });

    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: sendJpkiLambda.functionName,
      description: 'Lambda Function Name',
    });

    new cdk.CfnOutput(this, 'NatGatewayEip', {
      value: natGatewayEip.ref,
      description: 'NAT Gateway Elastic IP',
    });

    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'JpkiEndpoint', {
      value: `${api.url}jpki`,
      description: 'JPKI API Endpoint',
    });
  }
}
