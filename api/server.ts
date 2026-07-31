/**
 * 本地开发服务器 — 纯 Node.js HTTP，无框架依赖
 * 路由 /api/v2/* 到对应处理函数，其余请求代理到 Vite 前端
 */
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { pathToFileURL } from 'node:url';
import { routes } from './v2/routes';
import { sendJson } from './v2/_helpers';

const PORT = Number(process.env.API_PORT ?? 3001);

// ------------------------------------------------------------------
// CORS 处理
// ------------------------------------------------------------------

function setCorsHeaders(res: import('node:http').ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * 创建 HTTP 服务器（不监听端口）。
 * 导出供测试直接使用，避免 import server.ts 时产生副作用。
 */
export function createAppServer(): Server {
  return createServer(async (req, res) => {
    setCorsHeaders(res);

    // 处理 CORS 预检
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
    const routeKey = `${req.method} ${url.pathname}`;
    const handler = routes[routeKey];

    if (handler) {
      try {
        await handler(req, res);
      } catch (err) {
        console.error(`[API Error] ${routeKey}:`, err);
        if (!res.headersSent) {
          sendJson(res, 500, { detail: '服务器内部错误' });
        }
      }
    } else {
      sendJson(res, 404, { detail: `未找到路由: ${routeKey}` });
    }
  });
}

/** 启动本地开发服务器（仅直接运行时执行，测试 import 不触发） */
export function startServer(): Server {
  const server = createAppServer();
  server.listen(PORT, () => {
    console.log(`[tavern-translator-api] v2 服务运行于 http://localhost:${PORT}`);
    console.log(`[tavern-translator-api] 健康检查: http://localhost:${PORT}/api/v2/health`);
  });
  return server;
}

// 直接执行 `tsx server.ts` 时启动服务器
const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  startServer();
}
