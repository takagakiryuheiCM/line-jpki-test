import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3_deployment from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront_origins from 'aws-cdk-lib/aws-cloudfront-origins';


export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

        // Web サイトホスティング用 S3 バケットの作成
        const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
          removalPolicy: cdk.RemovalPolicy.DESTROY,
          autoDeleteObjects: true,
        });
    
        // CloudFront ディストリビューションの作成
        const distribution = new cloudfront.Distribution(this, 'Distribution', {
          defaultRootObject: 'index.html',
          defaultBehavior: {
            origin:
              // S3 バケットへの OAC によるアクセス制御を設定
              cloudfront_origins.S3BucketOrigin.withOriginAccessControl(
                websiteBucket
              ),
            // キャッシュポリシーを設定
            cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          },
          // SPAのルーティングのためのエラーレスポンス設定（これを設定しないとcallbackのリダイレクトがうまくいかない）
          errorResponses: [
            {
              httpStatus: 403, // Access Denied
              responseHttpStatus: 200,
              responsePagePath: '/index.html',
              ttl: cdk.Duration.minutes(0),
            },
            {
              httpStatus: 404, // Not Found
              responseHttpStatus: 200,
              responsePagePath: '/index.html',
              ttl: cdk.Duration.minutes(0),
            },
          ],
        });
    
        // // S3 バケットへのコンテンツのデプロイ
        // new s3_deployment.BucketDeployment(this, 'WebsiteDeploy', {
        //   sources: [s3_deployment.Source.asset('../frontend/dist')],
        //   destinationBucket: websiteBucket,
        //   distribution: distribution,
        //   distributionPaths: ['/*'],
        // });
  } 
}
