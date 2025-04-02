import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as targets from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

// ② JPKIサーバーからWebhookを受け取る際の固定IPは「NLB (EIP)→ ALB → Lambda」
export interface BackendNotifyLambdaStackProps extends cdk.StackProps {
  vpc: ec2.Vpc; // 共通VPCを受け取るためのプロパティ
  natGatewayEip: ec2.CfnEIP; // 共通NAT GatewayのEIPを受け取るためのプロパティ
}

export class BackendNotifyLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BackendNotifyLambdaStackProps) {
    super(scope, id, props);

    // 共通VPCを使用
    const vpc = props.vpc;

    // Lambda関数のセキュリティグループを作成
    const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'NotifyLambdaSecurityGroup', {
      vpc,
      description: 'Security group for JPKI Notify Lambda function',
      allowAllOutbound: true,
    });

    // ALBのセキュリティグループを作成
    const albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc,
      description: 'Security group for ALB',
      allowAllOutbound: true,
    });

    // ALBからLambdaへのアクセスを許可
    albSecurityGroup.connections.allowTo(
      lambdaSecurityGroup,
      ec2.Port.allTraffic(),
      'Allow traffic from ALB to Lambda'
    );

    // NLBからALBへのアクセスを許可
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic from NLB'
    );
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic from NLB'
    );

    // Lambda関数の実行ロールを作成
    const lambdaRole = new iam.Role(this, 'NotifyLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Lambda関数を作成
    const notifyLambda = new NodejsFunction(this, 'NotifyLambda', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: 'handler',
      entry: '../backend/handler/notify.ts', 
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, // プライベートサブネットに配置
      },
      securityGroups: [lambdaSecurityGroup],
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      environment: {
        // 環境変数を設定（必要に応じて）
        // JPKI_WEBHOOK_SECRET: 'your-webhook-secret', // 本番環境では適切なシークレット管理を使用してください
      },
    });

    // Application Load Balancer (ALB) を作成
    const alb = new elbv2.ApplicationLoadBalancer(this, 'NotifyAlb', {
      vpc,
      internetFacing: false, // 内部ALB（NLBからのみアクセス可能）
      securityGroup: albSecurityGroup,
    });

    // Lambda関数をターゲットとして追加
    const lambdaTarget = new targets.LambdaTarget(notifyLambda);

    // ALBのリスナーとターゲットグループを作成
    const albListener = alb.addListener('HttpListener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      // デフォルトのアクションを設定（必須）
      defaultAction: elbv2.ListenerAction.fixedResponse(404, {
        contentType: 'application/json',
        messageBody: JSON.stringify({ message: 'Not Found' }),
      }),
    });

    // ターゲットグループを作成し、Lambda関数を追加
    albListener.addTargets('NotifyLambdaTarget', {
      targets: [lambdaTarget],
      priority: 10,
      conditions: [
        elbv2.ListenerCondition.pathPatterns(['/jpki/notify']), // JPKIのWebhook受信APIのパス指定
      ],
      healthCheck: {
        enabled: true,
        path: '/jpki/notify',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyHttpCodes: '200',
      },
    });

    // Network Load Balancer (NLB) を作成
    const nlb = new elbv2.NetworkLoadBalancer(this, 'NotifyNlb', {
      vpc,
      internetFacing: true, // インターネットからアクセス可能
      crossZoneEnabled: true, 
    });

    // NLBのリスナーを作成
    const nlbListener = nlb.addListener('TcpListener', {
      port: 80,
      protocol: elbv2.Protocol.TCP,
    });

    // ALBをターゲットとして追加
    nlbListener.addTargets('AlbTarget', {
      port: 80,
      targets: [new targets.AlbListenerTarget(albListener)],
      preserveClientIp: true,
    });

    // 出力値の設定
    new cdk.CfnOutput(this, 'VpcId', {
      value: vpc.vpcId,
      description: 'VPC ID',
    });

    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: notifyLambda.functionName,
      description: 'Lambda Function Name',
    });

    new cdk.CfnOutput(this, 'AlbDnsName', {
      value: alb.loadBalancerDnsName,
      description: 'ALB DNS Name',
    });

    new cdk.CfnOutput(this, 'NlbDnsName', {
      value: nlb.loadBalancerDnsName,
      description: 'NLB DNS Name',
    });

    new cdk.CfnOutput(this, 'NlbArn', {
      value: nlb.loadBalancerArn,
      description: 'NLB ARN',
    });

    new cdk.CfnOutput(this, 'NotifyEndpoint', {
      value: `http://${nlb.loadBalancerDnsName}/jpki/notify`,
      description: 'JPKI Notify Endpoint',
    });
  }
}
