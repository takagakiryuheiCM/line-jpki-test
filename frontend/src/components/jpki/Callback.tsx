import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const JpkiCallback = () => {
  const [status, setStatus] = useState<string>("処理中...");
  const [params, setParams] = useState<Record<string, string>>({});
  const location = useLocation();

  useEffect(() => {
    // URLからクエリパラメータを取得
    const queryParams = new URLSearchParams(location.search);
    const paramsObject: Record<string, string> = {};
    
    queryParams.forEach((value, key) => {
      paramsObject[key] = value;
    });
    
    setParams(paramsObject);

    // JPKIからのレスポンスを処理
    if (paramsObject.status === "success") {
      setStatus("JPKI認証が正常に完了しました");
    } else if (paramsObject.status === "error") {
      setStatus(`エラーが発生しました: ${paramsObject.message || "不明なエラー"}`);
    } else {
      setStatus("処理結果を確認中...");
    }

    // 必要に応じてバックエンドAPIを呼び出して処理を完了させる
    // 例: 認証結果をバックエンドに送信する処理など
  }, [location]);

  return (
    <div className="jpki-callback-container">
      <h1>JPKI認証結果</h1>
      <div className="status-message">
        <p>{status}</p>
      </div>
      
      {Object.keys(params).length > 0 && (
        <div className="params-container">
          <h2>受信パラメータ</h2>
          <ul>
            {Object.entries(params).map(([key, value]) => (
              <li key={key}>
                <strong>{key}:</strong> {value}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="actions">
        <button onClick={() => window.history.back()}>戻る</button>
      </div>
    </div>
  );
};

export default JpkiCallback;
