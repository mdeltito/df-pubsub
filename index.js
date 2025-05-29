const { Worker, isMainThread, parentPort } = require("worker_threads");
const { setTimeout } = require("timers/promises");
const Redis = require("ioredis");

const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const CHANNEL = "test-channel";
const PUB_PER_LOOP = 20;

let shutting_down = false;
let shutdown_controller = new AbortController();

if (isMainThread) {
  const pub_worker = new Worker(__filename);
  let sub_client;

  async function setupClient() {
    sub_client = new Redis(REDIS_PORT, REDIS_HOST);
    sub_client.subscribe(CHANNEL, (err, count) => {
      if (err) {
        console.error("Failed to subscribe:", err);
      } else {
        console.log(`Subscribed to ${CHANNEL} (${count} subscriptions)`);
      }
    });

    sub_client.on("message", (channel, message) => {
      console.log(`Received message on ${channel}:`, message);
    });
  }

  async function teardownClient() {
    await sub_client.unsubscribe(CHANNEL);
    await sub_client.quit();
  }

  async function cycleClients() {
    while (!shutting_down) {
      console.log("[Main] Setting up Redis subscriber...");
      await setupClient();
      await setTimeout(Math.random() * 5000, null, {signal: shutdown_controller.signal});
      console.log("[Main] Tearing down Redis subscriber...");
      await teardownClient();
      await setTimeout(Math.random() * 1000), null, {signal: shutdown_controller.signal};
    }
  }

  async function cleanup() {
    console.log("[Main] Starting shutdown sequence...");
    shutting_down = true;
    shutdown_controller.abort();
    await teardownClient();
    pub_worker.postMessage("shutdown");
    console.log("[Main] finished");
  }

  process.on("SIGTERM", cleanup);
  process.on("SIGINT", cleanup);

  console.log("[Main] thread running. Cycling clients until SIGTERM.");
  cycleClients().catch(() => {});

} else {
  const pub_client = new Redis(REDIS_PORT, REDIS_HOST);
  let running = true;

  console.log("[Worker] thread running. Publishing messages until SIGTERM.");

  parentPort.on("message", async (msg) => {
    if (msg === "shutdown") {
      console.log("[Worker] Starting shutdown sequence...");
      running = false;
      await pub_client.quit();
      console.log("[Worker] finished");
      process.exit(0);
    }
  });

  async function loop() {
    while (running) {
      for (let i = 0; i < PUB_PER_LOOP; i++) {
        await pub_client.publish(CHANNEL, `message-${Date.now()}`);
      }
      await setTimeout(25, null, {signal: shutdown_controller.signal});
    }
  }

  loop();
}
