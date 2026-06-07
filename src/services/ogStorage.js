import { Indexer, MemData } from "@0gfoundation/0g-storage-ts-sdk/browser";

const DEFAULT_OG_PROOF_ANCHOR_CONTRACT = "0x61c60b1A07b55a23776dDe639933Aa01A5156c55";

function normalizeStorageError(error) {
  return error?.shortMessage || error?.reason || error?.message || "0G storage failed.";
}

export function getBrowserOgStorageSupportIssue() {
  return null;
}

function shouldProxyStorageNodeUrl(url) {
  if (typeof window === "undefined") {
    return false;
  }

  const { protocol, hostname, origin } = window.location;
  const isHttpsPage = protocol === "https:";
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

  if (!isHttpsPage || isLocalhost || !url) {
    return false;
  }

  try {
    const parsed = new URL(url, origin);
    return parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function toBrowserSafeStorageNodeUrl(url) {
  if (!shouldProxyStorageNodeUrl(url)) {
    return url;
  }

  const target = encodeURIComponent(url);
  return `${window.location.origin}/api/og-storage-node?target=${target}`;
}

function patchIndexerNodeTransport(indexer) {
  if (!indexer || typeof indexer.selectNodes !== "function") {
    return indexer;
  }

  const originalSelectNodes = indexer.selectNodes.bind(indexer);
  indexer.selectNodes = async (...args) => {
    const [clients, error] = await originalSelectNodes(...args);
    if (Array.isArray(clients)) {
      clients.forEach((client) => {
        if (client?.url) {
          client.url = toBrowserSafeStorageNodeUrl(client.url);
        }
      });
    }
    return [clients, error];
  };

  return indexer;
}

async function storeJsonOn0G({ payload, indexerRpc, evmRpc, signer }) {
  if (!indexerRpc) {
    throw new Error("Missing 0G indexer RPC.");
  }
  if (!evmRpc) {
    throw new Error("Missing 0G EVM RPC.");
  }
  if (!signer) {
    throw new Error("Missing wallet signer for 0G storage.");
  }

  const signerAddress = await signer.getAddress();
  const signerNetwork = await signer.provider?.getNetwork?.();
  const signerBalance = await signer.provider?.getBalance?.(signerAddress);

  if (Number(signerNetwork?.chainId || 0) !== 16661) {
    throw new Error("Switch your wallet to 0G Mainnet before storing data on 0G.");
  }

  if (signerBalance === 0n) {
    throw new Error("Your connected wallet has no 0G balance on 0G Mainnet. Fund it before uploading.");
  }

  // All storage payloads are serialized as JSON to keep the service reusable.
  const file = new MemData(new TextEncoder().encode(JSON.stringify(payload, null, 2)));
  const [tree, treeError] = await file.merkleTree();
  if (treeError) {
    throw new Error(normalizeStorageError(treeError));
  }

  const indexer = patchIndexerNodeTransport(new Indexer(indexerRpc));
  let uploadResult;
  let uploadError;

  try {
    [uploadResult, uploadError] = await indexer.upload(file, evmRpc, signer, {
      tags: "0x",
      finalityRequired: true,
      taskSize: 10,
      expectedReplica: 1,
      skipTx: false,
      fee: 0n,
    });
  } catch (error) {
    if (error?.code === "BAD_DATA" && error?.info?.method === "market") {
      throw new Error(
        "0G upload could not resolve a valid flow contract from the selected network. Please retry the upload and make sure the app is using the current 0G Mainnet RPC and indexer.",
      );
    }
    if (error?.code === "CALL_EXCEPTION") {
      throw new Error(
        "0G upload was rejected by the 0G Mainnet storage contract during gas estimation. Please retry once the current flow accepts submissions.",
      );
    }
    throw error;
  }

  if (uploadError) {
    throw new Error(normalizeStorageError(uploadError));
  }

  const result = {
    rootHash: uploadResult?.rootHash || tree?.rootHash?.() || "",
    txHash: uploadResult?.txHash || uploadResult?.hash || uploadResult?.transactionHash || "",
    tx: uploadResult,
  };

  const anchorTxHash = await anchorStorageRootOn0G({
    payloadType: payload?.type || "unknown",
    rootHash: result.rootHash,
    storageTxHash: result.txHash,
    signer,
    proofAnchorAddress: payload?.proofAnchorAddress || DEFAULT_OG_PROOF_ANCHOR_CONTRACT,
  });

  return {
    ...result,
    anchorTxHash,
  };
}

async function anchorStorageRootOn0G({ payloadType, rootHash, storageTxHash, signer, proofAnchorAddress }) {
  const anchorAddress = String(proofAnchorAddress || "").trim();
  if (!anchorAddress) {
    return "";
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(anchorAddress)) {
    throw new Error(`Invalid 0G proof anchor contract address: ${anchorAddress}`);
  }

  const signerAddress = await signer.getAddress();
  const metadata = {
    project: "ZendraOG",
    type: "0g-storage-root-anchor",
    payloadType,
    rootHash,
    storageTxHash,
    signer: signerAddress,
    anchoredAt: new Date().toISOString(),
  };
  const anchorTx = await signer.sendTransaction({
    to: anchorAddress,
    value: 0n,
    data: stringToHex(JSON.stringify(metadata)),
  });
  await anchorTx.wait();
  return anchorTx.hash;
}

function stringToHex(value) {
  const bytes = new TextEncoder().encode(value);
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export async function storeWalletAnalysisResults({
  address,
  chain,
  summary,
  assets,
  insights,
  indexerRpc,
  evmRpc,
  signer,
  proofAnchorAddress,
}) {
  return storeJsonOn0G({
    payload: {
      type: "wallet-analysis",
      proofAnchorAddress,
      storedAt: new Date().toISOString(),
      wallet: { address, chain },
      summary,
      insights,
      assets: Array.isArray(assets) ? assets : [],
    },
    indexerRpc,
    evmRpc,
    signer,
  });
}

export async function storeDashboardSnapshot({ reason, storage, indexerRpc, evmRpc, signer, proofAnchorAddress }) {
  return storeJsonOn0G({
    payload: {
      type: "dashboard-snapshot",
      proofAnchorAddress,
      storedAt: new Date().toISOString(),
      reason,
      storage,
    },
    indexerRpc,
    evmRpc,
    signer,
  });
}

export async function storeAiChatHistory({ sessionId, messages, metadata, indexerRpc, evmRpc, signer, proofAnchorAddress }) {
  return storeJsonOn0G({
    payload: {
      type: "ai-chat-history",
      proofAnchorAddress,
      storedAt: new Date().toISOString(),
      sessionId,
      metadata: metadata || {},
      messages: Array.isArray(messages) ? messages : [],
    },
    indexerRpc,
    evmRpc,
    signer,
  });
}

export async function storeTradeAnalysisLog({ log, indexerRpc, evmRpc, signer, proofAnchorAddress }) {
  return storeJsonOn0G({
    payload: {
      type: "trade-analysis-log",
      proofAnchorAddress,
      storedAt: new Date().toISOString(),
      log,
    },
    indexerRpc,
    evmRpc,
    signer,
  });
}

export async function storeStrategyMemory({ memory, indexerRpc, evmRpc, signer, proofAnchorAddress }) {
  return storeJsonOn0G({
    payload: {
      type: "strategy-memory",
      proofAnchorAddress,
      storedAt: new Date().toISOString(),
      memory,
    },
    indexerRpc,
    evmRpc,
    signer,
  });
}

export async function storeMarketSnapshot({ snapshot, indexerRpc, evmRpc, signer, proofAnchorAddress }) {
  return storeJsonOn0G({
    payload: {
      type: "market-snapshot",
      proofAnchorAddress,
      storedAt: new Date().toISOString(),
      snapshot,
    },
    indexerRpc,
    evmRpc,
    signer,
  });
}

export async function storeUserPreferences({ preferences, indexerRpc, evmRpc, signer, proofAnchorAddress }) {
  return storeJsonOn0G({
    payload: {
      type: "user-preferences",
      proofAnchorAddress,
      storedAt: new Date().toISOString(),
      preferences,
    },
    indexerRpc,
    evmRpc,
    signer,
  });
}

export async function storeTradeJournal({ journal, indexerRpc, evmRpc, signer, proofAnchorAddress }) {
  return storeJsonOn0G({
    payload: {
      type: "trade-journal",
      proofAnchorAddress,
      storedAt: new Date().toISOString(),
      journal,
    },
    indexerRpc,
    evmRpc,
    signer,
  });
}

export async function storeAiContextMemory({ context, indexerRpc, evmRpc, signer, proofAnchorAddress }) {
  return storeJsonOn0G({
    payload: {
      type: "ai-context-memory",
      proofAnchorAddress,
      storedAt: new Date().toISOString(),
      context,
    },
    indexerRpc,
    evmRpc,
    signer,
  });
}
