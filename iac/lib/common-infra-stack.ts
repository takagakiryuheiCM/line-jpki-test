import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

// 共通インフラストラクチャスタック（VPCとNAT Gatewayを含む）
export class CommonInfraStack extends cdk.Stack {
  // 他のスタックからアクセスできるようにVPCをpublicプロパティとして公開
  public readonly vpc: ec2.Vpc;
  public readonly natGatewayEip: ec2.CfnEIP;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPCの作成
    this.vpc = new ec2.Vpc(this, 'JpkiCommonVpc', {
      maxAzs: 2, // 可用性ゾーンの数（2つのAZを使用）
      natGateways: 1, // NAT Gatewayの数（1つのNAT Gatewayを共有）
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

    // NAT GatewayのEIPを取得（CDKが自動的に作成したもの）
    this.natGatewayEip = this.vpc.publicSubnets[0].node.findChild('EIP') as ec2.CfnEIP;

    // 出力値の設定
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'Common VPC ID',
      exportName: 'CommonVpcId', // 他のスタックから参照できるように名前をエクスポート
    });

    new cdk.CfnOutput(this, 'NatGatewayEip', {
      value: this.natGatewayEip.ref,
      description: 'NAT Gateway Elastic IP',
      exportName: 'CommonNatGatewayEip', // 他のスタックから参照できるように名前をエクスポート
    });
  }
}
