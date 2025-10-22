import { describe, expect, it, vi, beforeEach } from "vitest";

const listOrdersByDateMock = vi.fn();
const getOrderDetailsMock = vi.fn();

class AuthErrorMock extends Error {}
class NotFoundErrorMock extends Error {}
class UpstreamErrorMock extends Error {}

vi.mock("../src/sdk/cacheAdapters", () => ({
  InMemoryCacheAdapter: class {},
}));

vi.mock("../src/sdk/ordersClient", () => ({
  OrdersClient: class {
    constructor() {}
    listOrdersByDate = listOrdersByDateMock;
    getOrderDetails = getOrderDetailsMock;
    getCacheMetadata = () => ({ adapter: "memory", ttlMs: 30000 });
  },
  AuthError: AuthErrorMock,
  NotFoundError: NotFoundErrorMock,
  UpstreamError: UpstreamErrorMock,
}));

function createResponse() {
  const res: any = {
    statusCode: 200,
    headers: new Map<string, string>(),
    body: null as any,
    setHeader(name: string, value: string) {
      this.headers.set(name, value);
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    end(payload?: unknown) {
      this.body = payload ?? null;
      return this;
    },
  };
  return res;
}

beforeEach(() => {
  listOrdersByDateMock.mockReset();
  getOrderDetailsMock.mockReset();
});

describe("API /api/orders", () => {
  it("возвращает список заказов", async () => {
    listOrdersByDateMock.mockResolvedValue({ items: [], nextCursor: undefined, total: 0, hasMore: false });
    const handler = (await import("../src/pages/api/orders")).default;

    const req: any = { method: "GET", headers: { "x-user-id": "user-1" }, query: {} };
    const res = createResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(listOrdersByDateMock).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1" }));
    expect(res.body).toMatchObject({ items: [], meta: expect.objectContaining({ hasMore: false }) });
    expect(res.body.meta.cache).toMatchObject({ ttlMs: expect.any(Number) });
  });



  it("нормализует статус перед фильтрацией", async () => {
    listOrdersByDateMock.mockResolvedValue({ items: [], nextCursor: undefined, total: 0, hasMore: false });
    const handler = (await import("../src/pages/api/orders")).default;

    const req: any = { method: "GET", headers: { "x-user-id": "user-1" }, query: { status: "SuCcEeDeD" } };
    const res = createResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(listOrdersByDateMock).toHaveBeenCalledWith(expect.objectContaining({ status: "succeeded" }));
  });
  it("отдаёт 401 без userId", async () => {
    listOrdersByDateMock.mockResolvedValue({ items: [], nextCursor: undefined, total: 0, hasMore: false });
    const handler = (await import("../src/pages/api/orders")).default;

    const req: any = { method: "GET", headers: {}, query: {} };
    const res = createResponse();

    await handler(req, res);
    expect(res.statusCode).toBe(401);
  });
});

describe("API /api/orders/[orderId]", () => {
  it("возвращает детали заказа", async () => {
    getOrderDetailsMock.mockResolvedValue({
      order: { id: "ord-1", userId: "user-1" },
      items: [],
      payments: [],
      refunds: [],
      history: [],
    });
    const handler = (await import("../src/pages/api/orders/[orderId]")).default;

    const req: any = { method: "GET", headers: { "x-user-id": "user-1" }, query: { orderId: "ord-1" } };
    const res = createResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(getOrderDetailsMock).toHaveBeenCalledWith("ord-1", "user-1");
    expect(res.body.meta.cache).toMatchObject({ ttlMs: expect.any(Number) });
  });
});
