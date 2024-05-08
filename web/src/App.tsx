import { useState } from "react";
import "./App.css";
import { apiClient } from "./api_client";

function App() {
  const [data, setData] = useState<unknown>();

  const loginHandler = async () => {
    await apiClient.lucia.signin.$post({
      json: { email: "test1@lucia.com", password: "000000" },
      query: { code: "myPromo" },
    });
  };

  const protectedHandler = async () => {
    const res = await apiClient.lucia.test.$get();
    const data = await res.json();
    setData(data);
  };

  return (
    <div>
      <h1>App Web</h1>
      <button type="button" onClick={loginHandler}>
        Signin
      </button>
      <button type="button" onClick={protectedHandler}>
        Get data
      </button>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

export default App;
