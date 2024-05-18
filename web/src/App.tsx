import { useState } from "react";
import { apiClient } from "./api_client";

export function App() {
  const [data, setData] = useState<unknown>();

  const protectedHandler = async () => {
    const res = await apiClient.lucia.test.$get();
    const data = await res.json();
    setData(data);
  };

  return (
    <div className="container mx-auto">
      <h1>App Web</h1>
      <button type="button" onClick={protectedHandler}>
        Get data
      </button>
      <section className="flex items-center justify-center">
        <div className="flex flex-col gap-y-4 border p-5 rounded-lg shadow-md">
          <p className="text-lg font-bold">Войти</p>
          <a
            className="px-6 py-3 flex items-center justify-center gap-x-2 bg-blue-500 rounded-md text-white shadow-sm font-bold uppercase text-sm/none"
            href="/api/auth/github"
          >
            Login via Github
          </a>
          <a
            className="px-6 py-3 flex items-center justify-center gap-x-2 bg-blue-500 rounded-md text-white shadow-sm font-bold uppercase text-sm/none"
            href="/api/auth/vk"
          >
            Login via VK
          </a>
          <a
            className="px-6 py-3 flex items-center justify-center gap-x-2 bg-blue-500 rounded-md text-white shadow-sm font-bold uppercase text-sm/none"
            href="/api/auth/yandex"
          >
            Login via Yandex
          </a>
        </div>
      </section>

      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
