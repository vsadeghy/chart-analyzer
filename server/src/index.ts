import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { chartOptions } from "./bot/chartOptions";
import { NobitexExchange } from "./bot/exchanges";
import { Strategy } from "./bot/strategy";
import { env } from "./env";

const exchange = new NobitexExchange(chartOptions);
const strategy = new Strategy(exchange);
try {
  await strategy.init();
  strategy.run();
} catch (error) {
  console.error(error);
  process.exit(1);
}

const app = new Hono();
app.get("/", async (c) => {
  const chart = strategy.getChart();
  const indicators = strategy.getIndicators();
  const annotations = strategy.getAnnotations();
  return c.json({ chart, indicators, annotations });
});

const port = env.PORT;
serve({ ...app, port }, async () => {
  console.log(`Server is running on http://localhost:${port}`);
});
