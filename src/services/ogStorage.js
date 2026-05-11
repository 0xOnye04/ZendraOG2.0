import { Indexer, MemData } from "@0gfoundation/0g-storage-ts-sdk/browser";

function normalizeStorageError(error) {
  return error?.shortMessage || error?.reason || error?.message || "0G storage failed.";
}

export function getBrowserOgStorageSupportIssue() {
  if (typeof window === "undefined") {
    return null;
  }

  const { protocol, hostname } = window.location;
  const isHttpsPage = protocol === "https:";
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

  if (!isHttpsPage || isLocalhost) {
    return null;
  }

  return "0G Storage uploads are currently unavailable from this HTTPS deployment because the Galileo storage network still resolves browser uploads through insecure HTTP node endpoints. Use local development for uploads or move the upload step behind a secure backend/proxy.";
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

  const browserSupportIssue = getBrowserOgStorageSupportIssue();
  if (browserSupportIssue) {
    throw new Error(browserSupportIssue);
  }

  const signerAddress = await signer.getAddress();
  const signerNetwork = await signer.provider?.getNetwork?.();
  const signerBalance = await signer.provider?.getBalance?.(signerAddress);

  if (![16601, 16602].includes(Number(signerNetwork?.chainId || 0))) {
    throw new Error("Switch your wallet to 0G Galileo Testnet before storing data on 0G.");
  }

  if (signerBalance === 0n) {
    throw new Error("Your connected wallet has no OG balance on 0G Galileo Testnet. Fund it from the faucet before uploading.");
  }

  // All storage payloads are serialized as JSON to keep the service reusable.
  const file = new MemData(new TextEncoder().encode(JSON.stringify(payload, null, 2)));
  const [tree, treeError] = await file.merkleTree();
  if (treeError) {
    throw new Error(normalizeStorageError(treeError));
  }

  const indexer = new Indexer(indexerRpc);
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
        "0G upload could not resolve a valid flow contract from the selected network. Please retry the upload and make sure the app is using the current Galileo testnet RPC and indexer.",
      );
    }
    if (error?.code === "CALL_EXCEPTION") {
      throw new Error(
        "0G upload was rejected by the Galileo testnet storage contract during gas estimation. Please retry once the current flow accepts submissions.",
      );
    }
    throw error;
  }

  if (uploadError) {
    throw new Error(normalizeStorageError(uploadError));
  }

  return {
    rootHash: uploadResult?.rootHash || tree?.rootHash?.() || "",
    txHash: uploadResult?.txHash || uploadResult?.hash || uploadResult?.transactionHash || "",
    tx: uploadResult,
  };
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
}) {
  return storeJsonOn0G({
    payload: {
      type: "wallet-analysis",
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

export async function storeDashboardSnapshot({ reason, storage, indexerRpc, evmRpc, signer }) {
  return storeJsonOn0G({
    payload: {
      type: "dashboard-snapshot",
      storedAt: new Date().toISOString(),
      reason,
      storage,
    },
    indexerRpc,
    evmRpc,
    signer,
  });
}

export async function storeAiChatHistory({ sessionId, messages, metadata, indexerRpc, evmRpc, signer }) {
  return storeJsonOn0G({
    payload: {
      type: "ai-chat-history",
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

export async function storeTradeAnalysisLog({ log, indexerRpc, evmRpc, signer }) {
  return storeJsonOn0G({
    payload: {
      type: "trade-analysis-log",
      storedAt: new Date().toISOString(),
      log,
    },
    indexerRpc,
    evmRpc,
    signer,
  });
}

export async function storeStrategyMemory({ memory, indexerRpc, evmRpc, signer }) {
  return storeJsonOn0G({
    payload: {
      type: "strategy-memory",
      storedAt: new Date().toISOString(),
      memory,
    },
    indexerRpc,
    evmRpc,
    signer,
  });
}

export async function storeMarketSnapshot({ snapshot, indexerRpc, evmRpc, signer }) {
  return storeJsonOn0G({
    payload: {
      type: "market-snapshot",
      storedAt: new Date().toISOString(),
      snapshot,
    },
    indexerRpc,
    evmRpc,
    signer,
  });
}

export async function storeUserPreferences({ preferences, indexerRpc, evmRpc, signer }) {
  return storeJsonOn0G({
    payload: {
      type: "user-preferences",
      storedAt: new Date().toISOString(),
      preferences,
    },
    indexerRpc,
    evmRpc,
    signer,
  });
}

export async function storeTradeJournal({ journal, indexerRpc, evmRpc, signer }) {
  return storeJsonOn0G({
    payload: {
      type: "trade-journal",
      storedAt: new Date().toISOString(),
      journal,
    },
    indexerRpc,
    evmRpc,
    signer,
  });
}

export async function storeAiContextMemory({ context, indexerRpc, evmRpc, signer }) {
  return storeJsonOn0G({
    payload: {
      type: "ai-context-memory",
      storedAt: new Date().toISOString(),
      context,
    },
    indexerRpc,
    evmRpc,
    signer,
  });
}
