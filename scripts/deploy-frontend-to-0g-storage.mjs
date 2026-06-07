import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { JsonRpcProvider, Wallet, encodeBytes32String, formatEther, toUtf8Bytes } from "ethers";
import { Indexer, MemData } from "@0gfoundation/0g-storage-ts-sdk";

const PROJECT = "ZendraOG";
const DIST_DIR = resolve("dist");
const DEPLOYMENTS_DIR = resolve("deployments");
const OUTPUT_FILE = resolve(DEPLOYMENTS_DIR, "0g-frontend-storage-deployment.json");
const DEFAULT_OG_RPC_URL = "https://evmrpc.0g.ai";
const DEFAULT_OG_INDEXER_RPC = "https://indexer-storage-turbo.0g.ai";
const DEFAULT_OG_PROOF_ANCHOR_CONTRACT = "0x61c60b1A07b55a23776dDe639933Aa01A5156c55";

loadLocalEnv();

const rpcUrl = readEnv("OG_MAINNET_RPC_URL", "VITE_OG_EVM_RPC", DEFAULT_OG_RPC_URL);
const storageEvmRpc = readEnv("OG_STORAGE_EVM_RPC", "VITE_OG_EVM_RPC", rpcUrl);
const indexerRpc = readEnv("OG_STORAGE_INDEXER_RPC", "VITE_OG_INDEXER_RPC", DEFAULT_OG_INDEXER_RPC);
const proofAnchorContract = readEnv(
  "OG_PROOF_ANCHOR_CONTRACT",
  "VITE_OG_PROOF_ANCHOR_CONTRACT",
  DEFAULT_OG_PROOF_ANCHOR_CONTRACT,
);
const privateKey = process.env.PRIVATE_KEY;

if (!privateKey) {
  throw new Error("Missing PRIVATE_KEY. Set it in your terminal session before running this deploy script.");
}

if (!/^0x[a-fA-F0-9]{40}$/.test(proofAnchorContract)) {
  throw new Error(`Invalid 0G proof anchor contract address: ${proofAnchorContract}`);
}

console.log("Building frontend...");
execFileSync("npm", ["run", "build"], { stdio: "inherit", shell: process.platform === "win32" });

const provider = new JsonRpcProvider(rpcUrl, 16661);
const wallet = new Wallet(privateKey, provider);
const network = await provider.getNetwork();

if (Number(network.chainId) !== 16661) {
  throw new Error(`Expected 0G Mainnet chainId 16661, got ${network.chainId}.`);
}

const balance = await provider.getBalance(wallet.address);
if (balance === 0n) {
  throw new Error(`Wallet ${wallet.address} has no 0G on mainnet.`);
}

console.log(`Publishing frontend from ${wallet.address} on 0G Mainnet...`);
console.log(`Wallet balance: ${formatEther(balance)} 0G`);

const bundle = await buildFrontendBundle();
const bundleBytes = new TextEncoder().encode(JSON.stringify(bundle, null, 2));
const file = new MemData(bundleBytes);
const [tree, treeError] = await file.merkleTree();

if (treeError) {
  throw treeError;
}

const expectedRootHash = tree?.rootHash?.() || "";
console.log(`Prepared ${bundle.files.length} dist files.`);
console.log(`Bundle SHA-256: ${bundle.bundleSha256}`);
console.log(`Expected 0G root hash: ${expectedRootHash}`);
console.log("Uploading frontend bundle to 0G Storage...");

const indexer = new Indexer(indexerRpc);
const [uploadResult, uploadError] = await indexer.upload(file, storageEvmRpc, wallet, {
  tags: encodeBytes32String("zendra-frontend"),
  finalityRequired: true,
  taskSize: 10,
  expectedReplica: 1,
  skipTx: false,
  fee: 0n,
});

if (uploadError) {
  throw uploadError;
}

const storageRootHash = uploadResult?.rootHash || expectedRootHash;
const storageTxHash = uploadResult?.txHash || uploadResult?.hash || uploadResult?.transactionHash || "";
const anchorPayload = {
  project: PROJECT,
  type: "frontend-0g-storage-anchor",
  network: "0G Mainnet",
  chainId: 16661,
  storageRootHash,
  storageTxHash,
  bundleSha256: bundle.bundleSha256,
  fileCount: bundle.files.length,
  entrypoint: "index.html",
  createdAt: bundle.createdAt,
};

console.log("Anchoring frontend storage metadata on 0G Chain...");
const anchorTx = await wallet.sendTransaction({
  to: proofAnchorContract,
  value: 0n,
  data: toHexUtf8(JSON.stringify(anchorPayload)),
});
await anchorTx.wait();

const deployment = {
  ...anchorPayload,
  rpcUrl,
  indexerRpc,
  storageEvmRpc,
  proofAnchorContract,
  deployer: wallet.address,
  storageExplorer: "https://storagescan.0g.ai",
  storageTransactionHash: storageTxHash,
  chainAnchorTransactionHash: anchorTx.hash,
  chainAnchorExplorer: `https://chainscan.0g.ai/tx/${anchorTx.hash}`,
  bundle,
};

await mkdir(DEPLOYMENTS_DIR, { recursive: true });
await writeFile(OUTPUT_FILE, `${JSON.stringify(deployment, null, 2)}\n`);

console.log(`0G Storage root: ${storageRootHash}`);
if (storageTxHash) {
  console.log(`0G Storage tx: ${storageTxHash}`);
}
console.log(`0G Chain anchor tx: ${anchorTx.hash}`);
console.log(`Anchor explorer: https://chainscan.0g.ai/tx/${anchorTx.hash}`);
console.log("Saved: deployments/0g-frontend-storage-deployment.json");

async function buildFrontendBundle() {
  const files = await listFiles(DIST_DIR);
  const entries = [];

  for (const filePath of files) {
    const bytes = await readFile(filePath);
    const path = toPosixPath(relative(DIST_DIR, filePath));
    entries.push({
      path,
      size: bytes.length,
      sha256: sha256(bytes),
      contentBase64: bytes.toString("base64"),
    });
  }

  entries.sort((a, b) => a.path.localeCompare(b.path));

  const manifest = entries.map(({ contentBase64, ...entry }) => entry);
  const bundleSha256 = sha256(Buffer.from(JSON.stringify(manifest)));

  return {
    project: PROJECT,
    type: "frontend-build-artifacts",
    createdAt: new Date().toISOString(),
    sourceDirectory: "dist",
    entrypoint: "index.html",
    bundleSha256,
    files: entries,
  };
}

async function listFiles(dir) {
  const results = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await listFiles(entryPath));
      continue;
    }

    if (entry.isFile()) {
      const entryStat = await stat(entryPath);
      if (entryStat.size > 0) {
        results.push(entryPath);
      }
    }
  }

  return results;
}

function loadLocalEnv() {
  if (!existsSync(".env.local")) {
    return;
  }

  const raw = readFileSync(".env.local", "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      return;
    }

    const [key, ...rest] = trimmed.split("=");
    if (!process.env[key]) {
      process.env[key] = rest.join("=").trim();
    }
  });
}

function readEnv(primaryKey, fallbackKey, fallbackValue) {
  return process.env[primaryKey] || process.env[fallbackKey] || fallbackValue;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function toHexUtf8(value) {
  return `0x${Buffer.from(toUtf8Bytes(value)).toString("hex")}`;
}

function toPosixPath(path) {
  return path.split(sep).join("/");
}
