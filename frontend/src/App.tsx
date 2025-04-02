import { useEffect, useState } from "react";
import liff from "@line/liff";
import "./App.css";
import JpkiCallback from "./components/pages/jpki/Callback";
import { BrowserRouter, Routes, Route, Link } from "react-router";

function Home() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    liff
      .init({
        liffId: import.meta.env.VITE_LIFF_ID
      })
      .then(() => {
        setMessage("LIFF init succeeded.");
      })
      .catch((e: Error) => {
        setMessage("LIFF init failed.");
        setError(`${e}`);
      });
  }, []);

  return (
    <div className="App">
      <h1>create-liff-app</h1>
      {message && <p>{message}</p>}
      {error && (
        <p>
          <code>{error}</code>
        </p>
      )}
      <div>
        <Link to="/jpki/callback?status=success">JPKIコールバックテスト（成功）</Link>
      </div>
      <div>
        <Link to="/jpki/callback?status=error&message=テストエラー">JPKIコールバックテスト（エラー）</Link>
      </div>
      <a
        href="https://developers.line.biz/ja/docs/liff/"
        target="_blank"
        rel="noreferrer"
      >
        LIFF Documentation
      </a>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/jpki/callback" element={<JpkiCallback />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
