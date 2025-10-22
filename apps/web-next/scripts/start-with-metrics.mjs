#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Обёртка над next.start() с честным логированием продолжительности HTTP-запросов.
 */
import http from "node:http";
import { parse as parseUrl } from "node:url";
import process from "node:process";
import { performance } from "node:perf_hooks";
import next from "next";

const DEFAULT_PORT = 3000;
const DEFAULT_HOSTNAME = "0.0.0.0";

function parseCli(argv) {
  const result = {
    port: process.env.PORT ? Number(process.env.PORT) : DEFAULT_PORT,
    hostname: process.env.HOSTNAME || DEFAULT_HOSTNAME,
    keepAliveTimeout: 0,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      console.log(`Использование: node ./scripts/start-with-metrics.mjs [--port <n>] [--hostname <host>] [--keepAliveTimeout <ms>]

Аргументы:
  -p, --port <n>              Порт HTTP (по умолчанию ${DEFAULT_PORT})
  -H, --hostname <host>       Адрес для прослушивания (по умолчанию ${DEFAULT_HOSTNAME})
      --keepAliveTimeout <ms> Значение keepAliveTimeout для http.Server
  -h, --help                  Показать эту справку
`);
      process.exit(0);
    }
    if (arg === "-p" || arg === "--port") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error(`Флаг ${arg} требует значение (например, --port 3000).`);
      }
      result.port = Number(value);
      if (Number.isNaN(result.port)) {
        throw new Error(`Некорректный порт: "${value}".`);
      }
      i += 1;
      continue;
    }
    if (arg === "-H" || arg === "--hostname") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error(`Флаг ${arg} требует hostname.`);
      }
      result.hostname = value;
      i += 1;
      continue;
    }
    if (arg === "--keepAliveTimeout") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("Флаг --keepAliveTimeout требует значение в миллисекундах.");
      }
      result.keepAliveTimeout = Number(value);
      if (Number.isNaN(result.keepAliveTimeout)) {
        throw new Error(`Некорректное значение keepAliveTimeout: "${value}".`);
      }
      i += 1;
      continue;
    }
    throw new Error(`Неизвестный аргумент: "${arg}".`);
  }

  return result;
}

function formatDuration(ms) {
  if (ms < 1) return `${ms.toFixed(2)}ms`;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function createLogger() {
  return (req, res, durationMs) => {
    const method = req.method || "GET";
    const url = req.url || "/";
    const status = res.statusCode || 0;
    const contentLength = res.getHeader("content-length");
    const cacheHeader = res.getHeader("x-next-cache");
    const parts = [
      method.padEnd(6),
      status.toString().padStart(3),
      formatDuration(durationMs).padStart(8),
      url,
    ];
    if (contentLength) {
      parts.push(`size=${contentLength}`);
    }
    if (cacheHeader) {
      parts.push(`cache=${cacheHeader}`);
    }
    console.log(parts.join(" | "));
  };
}

async function main() {
  const args = parseCli(process.argv.slice(2));

  const app = next({
    dev: false,
    hostname: args.hostname,
    port: args.port,
  });

  const handle = app.getRequestHandler();
  await app.prepare();

  const logRequest = createLogger();

  const server = http.createServer(async (req, res) => {
    const start = performance.now();
    let finished = false;

    const logAndMark = () => {
      if (finished) return;
      finished = true;
      const duration = performance.now() - start;
      logRequest(req, res, duration);
    };

    res.on("finish", logAndMark);
    res.on("close", logAndMark);

    try {
      const parsedUrl = parseUrl(req.url ?? "", true);
      await handle(req, res, parsedUrl);
    } catch (error) {
      console.error("Ошибка при обработке запроса:", error);
      if (!res.headersSent) {
        res.statusCode = 500;
      }
      res.end("Internal Server Error");
    }
  });

  if (args.keepAliveTimeout > 0) {
    server.keepAliveTimeout = args.keepAliveTimeout;
  }

  const shutdown = async (signal) => {
    console.log(`\nПолучен сигнал ${signal}, завершаем работу...`);
    try {
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      await app.close();
      process.exit(0);
    } catch (error) {
      console.error("Ошибка при завершении работы сервера:", error);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  server.listen(args.port, args.hostname, () => {
    const address =
      args.hostname === "0.0.0.0" ? `http://localhost:${args.port}` : `http://${args.hostname}:${args.port}`;
    console.log(`🚀 Next.js запущен в production-режиме на ${address}`);
  });
}

main().catch((error) => {
  console.error("Не удалось запустить Next.js сервер:", error);
  process.exit(1);
});
