import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { JsonRpcProvider, Wallet, ContractFactory, formatEther } from "ethers";

const RPC_URL = process.env.OG_MAINNET_RPC_URL || "https://evmrpc.0g.ai";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  throw new Error("Missing PRIVATE_KEY. Set it only in your local terminal session before deploying.");
}

const provider = new JsonRpcProvider(RPC_URL, 16661);
const wallet = new Wallet(PRIVATE_KEY, provider);

// Minimal proof-anchor contract. The product integration proof is 0G
// Storage + 0G Compute; this anchor provides the required mainnet contract.
const abi = [];
const bytecode = "0x6001600c60003960016000f300";

const network = await provider.getNetwork();
if (Number(network.chainId) !== 16661) {
  throw new Error(`Expected 0G Mainnet chainId 16661, got ${network.chainId}.`);
}

const balance = await provider.getBalance(wallet.address);
if (balance === 0n) {
  throw new Error(`Wallet ${wallet.address} has no 0G on mainnet.`);
}

console.log(`Deploying from ${wallet.address} on 0G Mainnet...`);
console.log(`Wallet balance: ${formatEther(balance)} 0G`);

const factory = new ContractFactory(abi, bytecode, wallet);
const contract = await factory.deploy();
const tx = contract.deploymentTransaction();

console.log(`Deployment tx: ${tx.hash}`);

await contract.waitForDeployment();

const address = await contract.getAddress();
const deployment = {
  project: "ZendraOG",
  purpose: "0G APAC Hackathon mainnet proof anchor",
  network: "0G Mainnet",
  chainId: 16661,
  rpcUrl: RPC_URL,
  deployer: wallet.address,
  contractAddress: address,
  transactionHash: tx.hash,
  contractExplorer: `https://chainscan.0g.ai/address/${address}`,
  transactionExplorer: `https://chainscan.0g.ai/tx/${tx.hash}`,
  componentsUsed: ["0G Storage", "0G Compute"],
  deployedAt: new Date().toISOString(),
};

await mkdir(resolve("deployments"), { recursive: true });
await writeFile(
  resolve("deployments", "0g-mainnet-proof-anchor.json"),
  `${JSON.stringify(deployment, null, 2)}\n`,
);

console.log(`Contract address: ${address}`);
console.log(`Explorer: https://chainscan.0g.ai/address/${address}`);
console.log(`Tx: https://chainscan.0g.ai/tx/${tx.hash}`);
console.log("Saved: deployments/0g-mainnet-proof-anchor.json");
