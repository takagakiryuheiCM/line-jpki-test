import { Handler } from 'aws-lambda';

export const handler: Handler = async (event) => {
  console.log('Event received:', JSON.stringify(event));
  
  const url = 'https://checkip.amazonaws.com/';
  
  try {
    const response = await fetch(url);
    const res = await response.text();
    
    console.log('Response from checkip:', res);
    
    // API Gatewayプロキシ統合が期待する形式でレスポンスを返す
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Success',
        url: url,
        ip: res.trim(),
        timestamp: new Date().toISOString()
      })
    };
  } catch (err) {
    console.error('Error occurred:', err);
    
    // エラーの場合もAPI Gatewayプロキシ統合が期待する形式でレスポンスを返す
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Error',
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString()
      })
    };
  }
};
