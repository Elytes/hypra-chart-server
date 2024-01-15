import axios from "axios";
import { knex } from "knex";
import Web3 from "web3";
import express, { Express } from "express";
import http from "http";
import cors from "cors";
const environment = require("./environment.json");
const app: Express = express();
const port = environment.port;
const database = knex({
  client: "mysql2",
  connection: {
    host: environment.database_host,
    port: environment.database_port,
    user: environment.database_user,
    password: environment.database_password,
    database: environment.database,
  },
});
const web3 = new Web3("https://rpc.hypra.network/");
const retherSwapContract: any = new web3.eth.Contract(
  require("./retherswap-abi.json"),
  "0x11FE7aAD506545A3e371D4E4a1bEB1B63000b253"
);
// Setting CORS if server and client aren't on same host
app.use(cors({ maxAge: 86400 }));
// API used to get all the token prices of a token
app.get("/token_prices/:idToken", async (request: any, response) => {
  const rows = await database
    .select("token_prices.price", "token_prices.created_at")
    .from("token_prices")
    .join("tokens", "tokens.id", "token_prices.id_token")
    .where("tokens.contract_address", request.params.idToken);
  response.json(rows);
});
// API used to get all infos about a token
app.get("/tokens/:id", async (request: any, response) => {
  const rows = await database
    .select("tokens.*")
    .from("tokens")
    .where("tokens.contract_address", request.params.id)
    .limit(1);
  response.json(rows[0]);
});
// Method used to fetch the token's price every 60 seconds
setInterval(async () => {
  for (const token of await database.select().from("tokens")) {
    const originalValue: BigInt = (
      await retherSwapContract.methods
        .getAmountsIn(1e18, [token.contract_address, "0x0000000000079c645a9bde0bd8af1775faf5598a"])
        .call()
    )[0];
    const swapTokens = Number(originalValue) / Math.pow(10, 18);
    const pricePerHypra = await getCurrentPrice();
    const tokenPrice = (1 / swapTokens) * pricePerHypra * 1e18;
    await database
      .insert({
        id_token: token.id,
        price: tokenPrice,
        created_at: new Date(),
      })
      .into("token_prices");
  }
}, 60000);

// Method used to get current price in USD of Hypra
async function getCurrentPrice(): Promise<number> {
  const request = await axios.get(
    "https://explorer.hypra.network/api?module=stats&action=coinprice"
  );
  return request.data.result.coin_usd;
}
const httpServer = http.createServer({ maxHeaderSize: 32000 }, app);
httpServer.listen(port, () => {
  console.log(`[HttpServer] Ready to listen on port ${port}!`);
});
