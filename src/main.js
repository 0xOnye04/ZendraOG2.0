import "./style.css";
import { BrowserProvider, Contract, JsonRpcProvider, formatEther, formatUnits, parseEther, parseUnits } from "ethers";
import { Connection, PublicKey, clusterApiUrl } from "https://esm.sh/@solana/web3.js@1.98.2";
import { getBrowserOgStorageSupportIssue, storeDashboardSnapshot, storeWalletAnalysisResults } from "./zgStorage.js";

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

const CHAIN_CONFIG = {
  ethereum: {
    label: "Ethereum",
    chainId: 1,
    covalentChain: "eth-mainnet",
    nativeSymbol: "ETH",
    rpcUrl: "https://ethereum-rpc.publicnode.com",
    rpcUrls: [
      "https://1rpc.io/eth",
      "https://ethereum-rpc.publicnode.com",
    ],
    explorer: "https://etherscan.io/address/",
    zeroExBaseUrl: "https://api.0x.org",
    wrappedNative: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    tokens: {
      ETH: { symbol: "ETH", address: "ETH", decimals: 18, coingeckoId: "ethereum" },
      WETH: { symbol: "WETH", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals: 18, coingeckoId: "weth" },
      USDC: { symbol: "USDC", address: "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", decimals: 6, coingeckoId: "usd-coin" },
      USDT: { symbol: "USDT", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6, coingeckoId: "tether" },
      DAI: { symbol: "DAI", address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18, coingeckoId: "dai" },
      LINK: { symbol: "LINK", address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", decimals: 18, coingeckoId: "chainlink" },
      UNI: { symbol: "UNI", address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", decimals: 18, coingeckoId: "uniswap" },
      PEPE: { symbol: "PEPE", address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933", decimals: 18, coingeckoId: "pepe" },
      SHIB: { symbol: "SHIB", address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", decimals: 18, coingeckoId: "shiba-inu" },
    },
  },
  arbitrum: {
    label: "Arbitrum",
    chainId: 42161,
    covalentChain: "arbitrum-mainnet",
    nativeSymbol: "ETH",
    rpcUrl: "https://arbitrum-one-rpc.publicnode.com",
    rpcUrls: [
      "https://arb1.arbitrum.io/rpc",
      "https://1rpc.io/arb",
      "https://arbitrum-one-rpc.publicnode.com",
    ],
    explorer: "https://arbiscan.io/address/",
    zeroExBaseUrl: "https://arbitrum.api.0x.org",
    wrappedNative: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    tokens: {
      ETH: { symbol: "ETH", address: "ETH", decimals: 18, coingeckoId: "ethereum" },
      WETH: { symbol: "WETH", address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", decimals: 18, coingeckoId: "weth" },
      USDC: { symbol: "USDC", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6, coingeckoId: "usd-coin" },
      USDT: { symbol: "USDT", address: "0xFd086bC7CD5C481DCC9C85ebe478A1C0b69FCbb9", decimals: 6, coingeckoId: "tether" },
      ARB: { symbol: "ARB", address: "0x912CE59144191C1204E64559FE8253a0e49E6548", decimals: 18, coingeckoId: "arbitrum" },
      DAI: { symbol: "DAI", address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", decimals: 18, coingeckoId: "dai" },
      GMX: { symbol: "GMX", address: "0xfc5A1A6EB076aD7fD73A0fE7dF1A17b1bA3fA13A", decimals: 18, coingeckoId: "gmx" },
      RDNT: { symbol: "RDNT", address: "0x3082CC23568eA640225c2467653dB90e9250AaA0", decimals: 18, coingeckoId: "radiant-capital" },
    },
  },
  bsc: {
    label: "BSC",
    chainId: 56,
    covalentChain: "bsc-mainnet",
    nativeSymbol: "BNB",
    rpcUrl: "https://bsc-rpc.publicnode.com",
    rpcUrls: [
      "https://bsc-dataseed.bnbchain.org",
      "https://bsc-dataseed-public.bnbchain.org",
      "https://bnb.rpc.subquery.network/public",
      "https://bsc-rpc.publicnode.com",
    ],
    explorer: "https://bscscan.com/address/",
    zeroExBaseUrl: "https://bsc.api.0x.org",
    wrappedNative: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    tokens: {
      BNB: { symbol: "BNB", address: "BNB", decimals: 18, coingeckoId: "binancecoin" },
      WBNB: { symbol: "WBNB", address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", decimals: 18, coingeckoId: "wbnb" },
      USDC: { symbol: "USDC", address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", decimals: 18, coingeckoId: "usd-coin" },
      USDT: { symbol: "USDT", address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18, coingeckoId: "tether" },
      BUSD: { symbol: "BUSD", address: "0xe9e7cea3dedca5984780bafc599bd69add087d56", decimals: 18, coingeckoId: "binance-usd" },
      CAKE: { symbol: "CAKE", address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", decimals: 18, coingeckoId: "pancakeswap-token" },
      XRP: { symbol: "XRP", address: "0x1D2F0dA169ceB9Fc7B3144628dB156f3F6c60dBE", decimals: 18, coingeckoId: "binance-peg-xrp" },
      DOGE: { symbol: "DOGE", address: "0xbA2aE424d960c26247Dd6c32edC70B295c744C43", decimals: 8, coingeckoId: "binance-peg-dogecoin" },
    },
  },
  solana: {
    label: "Solana",
    rpcUrl: "https://api.mainnet.solana.com",
    rpcUrls: buildSolanaRpcUrls(),
    nativeSymbol: "SOL",
    explorer: "https://solscan.io/account/",
  },
};
const EVM_CHAIN_PARAMS = {
  1: {
    chainId: "0x1",
    chainName: "Ethereum Mainnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://ethereum-rpc.publicnode.com"],
    blockExplorerUrls: ["https://etherscan.io"],
  },
  42161: {
    chainId: "0xA4B1",
    chainName: "Arbitrum One",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://arbitrum-one-rpc.publicnode.com"],
    blockExplorerUrls: ["https://arbiscan.io"],
  },
  56: {
    chainId: "0x38",
    chainName: "BNB Smart Chain",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    rpcUrls: ["https://bsc-rpc.publicnode.com"],
    blockExplorerUrls: ["https://bscscan.com"],
  },
  16661: {
    chainId: "0x4115",
    chainName: "0G Mainnet",
    nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
    rpcUrls: ["https://evmrpc.0g.ai"],
    blockExplorerUrls: ["https://chainscan.0g.ai"],
  },
};

const DEFAULT_PRICE_COINS = ["bitcoin", "ethereum", "binancecoin", "solana", "arbitrum", "pepe", "dogecoin"];
const MEME_KEYWORDS = ["pepe", "doge", "shib", "inu", "cat", "frog", "meme", "floki", "bonk", "wojak"];
const OG_MAINNET_CHAIN_ID = 16661;
const OG_COMPATIBLE_MAINNET_CHAIN_IDS = new Set([OG_MAINNET_CHAIN_ID]);
const DEFAULT_OG_PROOF_ANCHOR_CONTRACT = "0x61c60b1A07b55a23776dDe639933Aa01A5156c55";
const CONFIG = {
  covalentApiKey: readRuntimeConfig("covalentApiKey"),
  coingeckoDemoApiKey: readRuntimeConfig("coingeckoDemoApiKey"),
  coingeckoProApiKey: readRuntimeConfig("coingeckoProApiKey"),
  zeroExApiKey: readRuntimeConfig("zeroExApiKey"),
  ogIndexerRpc: readRuntimeConfig("ogIndexerRpc"),
  ogEvmRpc: readRuntimeConfig("ogEvmRpc"),
  ogProofAnchorContract: readRuntimeConfig("ogProofAnchorContract"),
  ogAutoBackup: String(readRuntimeConfig("ogAutoBackup")).toLowerCase() === "true",
};
const WALLET_PREFERENCE_KEY = "zendra_wallet_preference";
const WALLET_AUTOCONNECT_KEY = "zendra_wallet_autoconnect";
const OG_STORAGE_KEY = "zendra_og_storage_v1";
const OG_BACKUP_META_KEY = "zendra_og_storage_backup_meta_v1";
const AI_TRADER_CONTEXT_KEY = "zendra_ai_trader_context_v1";
const OG_BACKUP_DEBOUNCE_MS = 1500;
const COINGECKO_PRICE_CACHE_TTL_MS = 2 * 60 * 1000;
const OG_STORAGE_LIMITS = {
  walletScores: 40,
  priceAlerts: 120,
  riskSnapshots: 40,
};
const discoveredEvmWallets = new Map();
let eip6963Initialized = false;
const connectedWalletListeners = {
  provider: null,
  accountsChanged: null,
  chainChanged: null,
  disconnect: null,
};

const state = {
  provider: null,
  signer: null,
  rawEvmProvider: null,
  connectedWalletKey: null,
  connectedWalletLabel: null,
  walletAddress: null,
  walletChainId: null,
  lastTracked: null,
  trackedPortfolio: [],
  trackedSummary: null,
  marketPrices: [],
  trendingTokens: [],
  coinGeckoPriceCache: new Map(),
  ogStorage: getDefaultOgStorage(),
  ogBackupInFlight: false,
  ogBackupTimer: null,
  ogLastBackupMeta: null,
};

const elements = {
  totalValue: document.getElementById("totalValue"),
  portfolioChange: document.getElementById("portfolioChange"),
  alertsCount: document.getElementById("alertsCount"),
  smartSignals: document.getElementById("smartSignals"),
  riskScore: document.getElementById("riskScore"),
  riskSummary: document.getElementById("riskSummary"),
  portfolioList: document.getElementById("portfolioList"),
  tokenList: document.getElementById("tokenList"),
  priceList: document.getElementById("priceList"),
  alertList: document.getElementById("alertList"),
  riskList: document.getElementById("riskList"),
  activityFeed: document.getElementById("activityFeed"),
  smartMoneyList: document.getElementById("smartMoneyList"),
  walletStatus: document.getElementById("walletStatus"),
  walletMenu: document.getElementById("walletMenu"),
  ogStorageStatus: document.getElementById("ogStorageStatus"),
  trackAddressInput: document.getElementById("trackAddressInput"),
  trackChainSelect: document.getElementById("trackChainSelect"),
  swapChain: document.getElementById("swapChain"),
  swapFromToken: document.getElementById("swapFromToken"),
  swapToToken: document.getElementById("swapToToken"),
  swapAmount: document.getElementById("swapAmount"),
  swapSlippage: document.getElementById("swapSlippage"),
  swapStatus: document.getElementById("swapStatus"),
};

window.showDashboard = () => scrollToCard(".summary-cards");
window.showMarkets = () => scrollToCard(".prices-card");
window.showSwap = () => scrollToCard(".swap-card");
window.showSmartMoney = () => scrollToCard(".smart-card");
window.runAgent = () => openAiTraderPage();
window.connectEVM = () => connectEVM();
window.selectAndConnectWallet = (walletKey) => selectAndConnectWallet(walletKey);
window.disconnectWallet = () => disconnectWallet();
window.backupOgStorageNow = () => backupOgStorageNow();
window.getOgBackupReadiness = () => getOgBackupReadinessIssues();
window.configureOgStorage = () => configureOgStorage();
window.sendEVM = () => sendEVM();
window.loadTrackedPortfolio = () => loadTrackedPortfolio();
window.swap = () => swap();

bootstrap();

async function bootstrap() {
  initEip6963WalletDiscovery();
  hydrateWalletOptions();
  bindUiListeners();
  loadOgStorage();
  renderStoredOgData();
  renderPricesLoading();
  renderTrendingLoading();
  renderActivity([
    "Watching CoinGecko markets for price movement.",
    "Waiting for a tracked wallet to score and classify.",
    "Swap engine ready. Connect an EVM wallet to execute.",
  ]);

  await Promise.allSettled([loadMarketData(), restoreConnectedWallet()]);
  window.setInterval(() => {
    loadMarketData().catch((error) => console.error("Market refresh failed", error));
  }, 60_000);
}

function readRuntimeConfig(key) {
  if (key === "ogEvmRpc") {
    window.localStorage.removeItem("zendra_ogEvmRpc");
    return "https://evmrpc.0g.ai";
  }

  if (key === "ogIndexerRpc") {
    window.localStorage.removeItem("zendra_ogIndexerRpc");
    return "https://indexer-storage-turbo.0g.ai";
  }

  const runtime = window.ZENDRA_CONFIG || {};
  const envKey = `VITE_${camelToEnvKey(key)}`;
  const envValue = import.meta.env?.[envKey];
  const localValue = window.localStorage.getItem(`zendra_${key}`) || "";
  const fallbackValue = getDefaultRuntimeConfigValue(key);
  return runtime[key] || envValue || localValue || fallbackValue;
}

function getDefaultRuntimeConfigValue(key) {
  if (key === "ogEvmRpc") {
    return "https://evmrpc.0g.ai";
  }

  if (key === "ogIndexerRpc") {
    return "https://indexer-storage-turbo.0g.ai";
  }

  if (key === "ogProofAnchorContract") {
    return DEFAULT_OG_PROOF_ANCHOR_CONTRACT;
  }

  return "";
}

function buildSolanaRpcUrls() {
  const configuredPrimary = readRuntimeConfig("solanaRpc");
  const configuredFallbacks = String(readRuntimeConfig("solanaRpcFallbacks") || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return uniqueUrls([
    configuredPrimary,
    ...configuredFallbacks,
    "https://api.mainnet.solana.com",
    "https://api.mainnet-beta.solana.com",
    "https://rpc.ankr.com/solana",
    clusterApiUrl("mainnet-beta"),
  ]);
}

function uniqueUrls(urls) {
  return Array.from(new Set(urls.filter(Boolean)));
}

function camelToEnvKey(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
}

function hydrateWalletOptions() {
  const preference = window.localStorage.getItem(WALLET_PREFERENCE_KEY);
  if (["metamask", "rabby", "injected"].includes(preference)) {
    return;
  }

  window.localStorage.setItem(WALLET_PREFERENCE_KEY, "metamask");
}

function bindUiListeners() {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.closest("#walletMenu")) {
      return;
    }

    if (target.closest('[onclick="connectEVM()"]')) {
      return;
    }

    closeWalletMenu();
  });
}

function getPreferredWalletKey() {
  const key = window.localStorage.getItem(WALLET_PREFERENCE_KEY);
  if (["metamask", "rabby", "injected"].includes(key)) {
    return key;
  }

  return "metamask";
}

function toggleWalletMenu() {
  if (!elements.walletMenu) {
    return;
  }

  elements.walletMenu.classList.toggle("hidden");
}

function closeWalletMenu() {
  elements.walletMenu?.classList.add("hidden");
}

function getDefaultOgStorage() {
  return {
    walletScores: [],
    priceAlerts: [],
    riskSnapshots: [],
  };
}

function loadOgStorage() {
  try {
    const raw = window.localStorage.getItem(OG_STORAGE_KEY);
    if (!raw) {
      state.ogStorage = getDefaultOgStorage();
      return;
    }

    const parsed = JSON.parse(raw);
    state.ogStorage = {
      walletScores: Array.isArray(parsed.walletScores) ? parsed.walletScores : [],
      priceAlerts: Array.isArray(parsed.priceAlerts) ? parsed.priceAlerts : [],
      riskSnapshots: Array.isArray(parsed.riskSnapshots) ? parsed.riskSnapshots : [],
    };
  } catch {
    state.ogStorage = getDefaultOgStorage();
  }

  try {
    const metaRaw = window.localStorage.getItem(OG_BACKUP_META_KEY);
    state.ogLastBackupMeta = metaRaw ? JSON.parse(metaRaw) : null;
  } catch {
    state.ogLastBackupMeta = null;
  }
}

function saveOgStorage() {
  window.localStorage.setItem(OG_STORAGE_KEY, JSON.stringify(state.ogStorage));
  scheduleOgBackup("auto");
}

function prependOgRecord(bucket, record) {
  state.ogStorage[bucket] = [record, ...state.ogStorage[bucket]].slice(0, OG_STORAGE_LIMITS[bucket]);
  saveOgStorage();
}

function renderStoredOgData() {
  const latestScore = state.ogStorage.walletScores[0];
  const latestRisk = state.ogStorage.riskSnapshots[0];
  const recentPriceAlerts = state.ogStorage.priceAlerts.slice(0, 3);
  if (!latestScore && !latestRisk && !recentPriceAlerts.length) {
    return;
  }

  if (latestScore) {
    const chainLabel = getChainLabel(latestScore.chain) || latestScore.chain || "Unknown";
    elements.riskSummary.textContent = `Last saved score ${latestScore.score}/100 | ${latestScore.label}`;
    elements.portfolioChange.textContent = `Last tracked ${shortenAddress(latestScore.address)} on ${chainLabel}`;
  }

  if (latestRisk) {
    elements.riskScore.textContent = latestRisk.risk;
  }
  if (state.ogStorage.priceAlerts.length) {
    elements.alertsCount.textContent = String(state.ogStorage.priceAlerts.length);
  }

  const alertLines = [];
  if (latestScore) {
    alertLines.push(`Saved wallet score: ${latestScore.score}/100 (${latestScore.label})`);
  }
  recentPriceAlerts.forEach((alert) => {
    alertLines.push(`Saved price alert: ${alert.symbol} ${alert.changeText} at ${alert.priceText}`);
  });
  if (state.ogLastBackupMeta?.timestamp) {
    const txHash = state.ogLastBackupMeta.anchorTxHash || state.ogLastBackupMeta.txHash;
    const txLabel = txHash
      ? txHash.slice(0, 12)
      : "pending";
    alertLines.push(`0G store: ${formatTimestamp(state.ogLastBackupMeta.timestamp)} | anchor ${txLabel}...`);
  }

  const riskLines = state.ogStorage.riskSnapshots.slice(0, 3).map((item) => (
    `${formatTimestamp(item.timestamp)} | ${item.risk} | ${item.topAlert}`
  ));

  if (alertLines.length) {
    renderParagraphList(elements.alertList, alertLines);
  }
  if (riskLines.length) {
    renderParagraphList(elements.riskList, riskLines);
  }
}

function getOgBackupReadinessIssues() {
  const issues = [];
  const browserStorageIssue = getBrowserOgStorageSupportIssue();
  if (browserStorageIssue) {
    issues.push(browserStorageIssue);
  }
  if (!CONFIG.ogIndexerRpc) {
    issues.push("Missing 0G indexer RPC");
  }
  if (!CONFIG.ogEvmRpc) {
    issues.push("Missing 0G EVM RPC");
  }
  if (!state.signer) {
    issues.push("Connect an EVM wallet");
  }
  if (!state.walletAddress) {
    issues.push("No connected wallet address");
  }
  if (!state.walletChainId) {
    issues.push("Wallet is not on an EVM chain");
  }

  return issues;
}

function canWriteOgBackup() {
  return getOgBackupReadinessIssues().length === 0;
}

function scheduleOgBackup(reason) {
  if (!CONFIG.ogAutoBackup || !canWriteOgBackup()) {
    return;
  }

  if (state.ogBackupTimer) {
    window.clearTimeout(state.ogBackupTimer);
  }

  state.ogBackupTimer = window.setTimeout(() => {
    backupOgStorage(reason).catch((error) => console.error("0G backup failed", error));
  }, OG_BACKUP_DEBOUNCE_MS);
}

async function backupOgStorageNow() {
  await configureOgStorage();
  const issues = getOgBackupReadinessIssues();
  if (issues.length) {
    setSwapStatus(`0G backup blocked: ${issues.join(" | ")}`);
    return;
  }

  const ok = await backupOgStorage("manual");
  if (ok) {
    setSwapStatus("0G backup completed.");
    return;
  }

  setSwapStatus("0G backup skipped. Connect an EVM wallet and set ogIndexerRpc + ogEvmRpc.");
}

async function configureOgStorage() {
  if (!CONFIG.ogIndexerRpc) {
    const indexerRpc = window.prompt(
      "Enter your 0G Indexer RPC URL for Storage uploads",
      window.localStorage.getItem("zendra_ogIndexerRpc") || "",
    );
    if (indexerRpc && indexerRpc.trim()) {
      setRuntimeConfig("ogIndexerRpc", indexerRpc.trim());
    }
  }

  if (!CONFIG.ogEvmRpc) {
    const evmRpc = window.prompt(
      "Enter your 0G EVM RPC URL for mainnet transactions",
      window.localStorage.getItem("zendra_ogEvmRpc") || "",
    );
    if (evmRpc && evmRpc.trim()) {
      setRuntimeConfig("ogEvmRpc", evmRpc.trim());
    }
  }
}

function setRuntimeConfig(key, value) {
  const normalized = String(value || "").trim();
  CONFIG[key] = normalized;
  if (normalized) {
    window.localStorage.setItem(`zendra_${key}`, normalized);
    return;
  }

  window.localStorage.removeItem(`zendra_${key}`);
}

async function backupOgStorage(reason = "auto") {
  const issues = getOgBackupReadinessIssues();
  if (issues.length || state.ogBackupInFlight) {
    if (reason === "manual" && issues.length) {
      setSwapStatus(`0G backup blocked: ${issues.join(" | ")}`);
    }
    return false;
  }

  state.ogBackupInFlight = true;
  try {
    if (reason === "manual") {
      setSwapStatus("Preparing 0G backup and requesting wallet signature...");
    }
    const signer = await ensureOgStorageSigner();
    const { rootHash, txHash, anchorTxHash } = await storeDashboardSnapshot({
      reason,
      storage: state.ogStorage,
      indexerRpc: CONFIG.ogIndexerRpc,
      evmRpc: CONFIG.ogEvmRpc,
      proofAnchorAddress: CONFIG.ogProofAnchorContract,
      signer,
    });

    state.ogLastBackupMeta = {
      timestamp: Date.now(),
      txHash,
      anchorTxHash,
      rootHash,
      reason,
      address: state.walletAddress,
    };
    window.localStorage.setItem(OG_BACKUP_META_KEY, JSON.stringify(state.ogLastBackupMeta));
    renderStoredOgData();
    renderActivity([
      `0G backup completed (${reason}).`,
      `Anchor: ${(state.ogLastBackupMeta.anchorTxHash || "pending").slice(0, 14)}...`,
      rootHash ? `Root: ${rootHash.slice(0, 18)}...` : "Root hash pending.",
    ]);
    return true;
  } catch (error) {
    console.error("0G backup failed", error);
    if (reason === "manual") {
      setSwapStatus(normalizeError(error, "0G backup failed."));
    }
    return false;
  } finally {
    state.ogBackupInFlight = false;
  }
}

function getInjectedEvmProviders() {
  const providers = [];
  const seen = new Set();

  discoveredEvmWallets.forEach(({ provider }) => {
    if (!provider || seen.has(provider)) {
      return;
    }
    seen.add(provider);
    providers.push(provider);
  });

  if (window.ethereum) {
    if (Array.isArray(window.ethereum.providers) && window.ethereum.providers.length) {
      window.ethereum.providers.forEach((provider) => {
        if (!provider || seen.has(provider)) {
          return;
        }
        seen.add(provider);
        providers.push(provider);
      });
    } else if (!seen.has(window.ethereum)) {
      seen.add(window.ethereum);
      providers.push(window.ethereum);
    }
  }

  return providers;
}

function getPrimaryInjectedProvider() {
  const providers = getInjectedEvmProviders();
  return providers[0] || window.ethereum || null;
}

function initEip6963WalletDiscovery() {
  if (eip6963Initialized) {
    return;
  }

  eip6963Initialized = true;
  window.addEventListener("eip6963:announceProvider", handleEip6963ProviderAnnouncement);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

function handleEip6963ProviderAnnouncement(event) {
  const detail = event?.detail;
  const provider = detail?.provider;
  const info = detail?.info;
  if (!provider || !info?.uuid) {
    return;
  }

  discoveredEvmWallets.set(info.uuid, { info, provider });
}

function getDiscoveredWalletByRdns(fragment) {
  const loweredFragment = String(fragment || "").toLowerCase();
  for (const { info, provider } of discoveredEvmWallets.values()) {
    const rdns = String(info?.rdns || "").toLowerCase();
    const name = String(info?.name || "").toLowerCase();
    if (rdns.includes(loweredFragment) || name.includes(loweredFragment)) {
      return provider;
    }
  }

  return null;
}

function findMetaMaskProvider() {
  const providers = getInjectedEvmProviders();
  const announcedProvider = getDiscoveredWalletByRdns("metamask");
  const directProvider = window.ethereum?.isMetaMask ? window.ethereum : null;
  const listedProvider = providers.find((item) => item?.isMetaMask) || null;

  if (announcedProvider) {
    return announcedProvider;
  }

  if (directProvider) {
    return directProvider;
  }

  if (listedProvider) {
    return listedProvider;
  }

  if (providers.length === 1) {
    return providers[0];
  }

  return null;
}

function getWalletDefinition(walletKey) {
  const providers = getInjectedEvmProviders();
  if (walletKey === "metamask") {
    const provider = findMetaMaskProvider();
    return { key: walletKey, label: "MetaMask", kind: "evm", provider };
  }

  if (walletKey === "rabby") {
    const provider = getDiscoveredWalletByRdns("rabby") || providers.find((item) => item.isRabby) || null;
    return { key: walletKey, label: "Rabby", kind: "evm", provider };
  }

  if (walletKey === "injected") {
    const provider = providers[0] || null;
    return { key: walletKey, label: "Injected EVM", kind: "evm", provider };
  }

  if (walletKey === "phantom") {
    const provider = window.phantom?.solana || (window.solana?.isPhantom ? window.solana : null);
    return { key: walletKey, label: "Phantom", kind: "solana", provider };
  }

  return null;
}

function detachWalletListeners() {
  if (!connectedWalletListeners.provider) {
    return;
  }

  const provider = connectedWalletListeners.provider;
  if (connectedWalletListeners.accountsChanged) {
    provider.removeListener?.("accountsChanged", connectedWalletListeners.accountsChanged);
    provider.removeListener?.("accountChanged", connectedWalletListeners.accountsChanged);
  }
  if (connectedWalletListeners.chainChanged) {
    provider.removeListener?.("chainChanged", connectedWalletListeners.chainChanged);
  }
  if (connectedWalletListeners.disconnect) {
    provider.removeListener?.("disconnect", connectedWalletListeners.disconnect);
  }

  connectedWalletListeners.provider = null;
  connectedWalletListeners.accountsChanged = null;
  connectedWalletListeners.chainChanged = null;
  connectedWalletListeners.disconnect = null;
}

function bindWalletListeners(walletDef) {
  detachWalletListeners();
  if (!walletDef?.provider) {
    return;
  }

  connectedWalletListeners.provider = walletDef.provider;

  if (walletDef.kind === "evm") {
    connectedWalletListeners.accountsChanged = async (accounts) => {
      if (!accounts.length) {
        clearConnectedWallet();
        return;
      }

      await setConnectedEvmWallet(accounts[0], walletDef);
    };
    connectedWalletListeners.chainChanged = async (hexChainId) => {
      const chainId = parseChainId(hexChainId);
      if (!OG_COMPATIBLE_MAINNET_CHAIN_IDS.has(chainId)) {
        setSwapStatus("Wrong 0G network detected. Switching to 0G Mainnet...");
        await ensureEvmProviderOnOgMainnet(walletDef.provider);
      }
      state.walletChainId = await readInjectedChainId(walletDef.provider);
      state.provider = new BrowserProvider(walletDef.provider);
      state.signer = await state.provider.getSigner();
      updateWalletStatus();
      const chain = getChainKeyByChainId(state.walletChainId);
      if (state.walletAddress && chain) {
        elements.trackAddressInput.value = state.walletAddress;
        elements.trackChainSelect.value = chain;
        await loadTrackedPortfolio(state.walletAddress, chain);
      }
    };
    walletDef.provider.on?.("accountsChanged", connectedWalletListeners.accountsChanged);
    walletDef.provider.on?.("chainChanged", connectedWalletListeners.chainChanged);
    return;
  }

  connectedWalletListeners.accountsChanged = async (publicKey) => {
    if (!publicKey) {
      clearConnectedWallet();
      return;
    }

    await setConnectedSolanaWallet(publicKey.toBase58(), walletDef);
  };
  connectedWalletListeners.disconnect = () => clearConnectedWallet();
  walletDef.provider.on?.("accountChanged", connectedWalletListeners.accountsChanged);
  walletDef.provider.on?.("disconnect", connectedWalletListeners.disconnect);
}

async function restoreConnectedWallet() {
  if (window.localStorage.getItem(WALLET_AUTOCONNECT_KEY) === "false") {
    updateWalletStatus();
    return;
  }

  const walletKey = getPreferredWalletKey();
  const walletDef = getWalletDefinition(walletKey);
  if (!walletDef?.provider) {
    updateWalletStatus();
    return;
  }

  bindWalletListeners(walletDef);
  if (walletDef.kind === "evm") {
    const accounts = await walletDef.provider.request({ method: "eth_accounts" });
    if (!accounts.length) {
      updateWalletStatus();
      return;
    }
    await setConnectedEvmWallet(accounts[0], walletDef);
    return;
  }

  try {
    const response = await walletDef.provider.connect({ onlyIfTrusted: true });
    const address = response?.publicKey?.toBase58?.() || walletDef.provider.publicKey?.toBase58?.();
    if (!address) {
      updateWalletStatus();
      return;
    }
    await setConnectedSolanaWallet(address, walletDef);
  } catch {
    updateWalletStatus();
  }
}

async function connectEVM() {
  toggleWalletMenu();
}

async function selectAndConnectWallet(walletKey) {
  closeWalletMenu();
  let walletDef = getWalletDefinition(walletKey);
  if (walletKey === "metamask" && !walletDef?.provider) {
    const fallbackProvider = getPrimaryInjectedProvider();
    if (fallbackProvider) {
      walletDef = {
        key: "injected",
        label: "Injected EVM",
        kind: "evm",
        provider: fallbackProvider,
      };
      setSwapStatus("MetaMask was not directly exposed, so the app is using the available injected wallet.");
    }
  }

  if (!walletDef?.provider) {
    elements.walletStatus.textContent = `${walletDef?.label || "Wallet"} not detected`;
    setSwapStatus("Install the selected wallet extension and refresh.");
    return;
  }

  try {
    bindWalletListeners(walletDef);
    window.localStorage.setItem(WALLET_PREFERENCE_KEY, walletDef.key);
    window.localStorage.setItem(WALLET_AUTOCONNECT_KEY, "true");

    if (walletDef.kind === "evm") {
      await ensureEvmProviderOnOgMainnet(walletDef.provider);
    }

    const accounts = await requestWalletAccounts(walletDef.provider);
    if (!accounts.length) {
      throw new Error(`${walletDef.label} did not return an account.`);
    }

    await setConnectedEvmWallet(accounts[0], walletDef);
    const chain = getChainKeyByChainId(state.walletChainId) || "ethereum";
    elements.trackAddressInput.value = state.walletAddress;
    elements.trackChainSelect.value = chain;
    await loadTrackedPortfolio(state.walletAddress, chain);
  } catch (error) {
    console.error(error);
    setSwapStatus(normalizeError(error, "Wallet connection request was cancelled or failed."));
  }
}

async function requestWalletAccounts(provider) {
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  return Array.isArray(accounts) ? accounts.filter(Boolean) : [];
}

async function disconnectWallet() {
  const walletDef = getWalletDefinition(state.connectedWalletKey || getPreferredWalletKey());
  try {
    if (walletDef?.kind === "solana" && walletDef.provider?.isConnected) {
      await walletDef.provider.disconnect();
    }
  } catch (error) {
    console.warn("Wallet disconnect call failed", error);
  } finally {
    detachWalletListeners();
    clearConnectedWallet();
    window.localStorage.setItem(WALLET_AUTOCONNECT_KEY, "false");
    renderActivity(["Wallet disconnected from app session."]);
  }
}

async function setConnectedEvmWallet(address, walletDef) {
  await ensureEvmProviderOnOgMainnet(walletDef.provider);
  state.rawEvmProvider = walletDef.provider;
  state.provider = new BrowserProvider(walletDef.provider);
  state.signer = await state.provider.getSigner();
  state.walletAddress = address;
  state.connectedWalletKey = walletDef.key;
  state.connectedWalletLabel = walletDef.label;
  state.walletChainId = await readInjectedChainId(walletDef.provider);
  const chainKey = getChainKeyByChainId(state.walletChainId);
  if (chainKey && elements.swapChain) {
    elements.swapChain.value = chainKey;
  }
  updateWalletStatus();
  setSwapStatus(`${walletDef.label} connected on ${getChainLabel(getChainKeyByChainId(state.walletChainId))}.`);
}

async function setConnectedSolanaWallet(address, walletDef) {
  state.provider = null;
  state.rawEvmProvider = null;
  state.signer = null;
  state.walletAddress = address;
  state.walletChainId = null;
  state.connectedWalletKey = walletDef.key;
  state.connectedWalletLabel = walletDef.label;
  updateWalletStatus();
  setSwapStatus(`${walletDef.label} connected on Solana. Swap and send are EVM only.`);
}

function clearConnectedWallet() {
  if (state.ogBackupTimer) {
    window.clearTimeout(state.ogBackupTimer);
    state.ogBackupTimer = null;
  }
  state.provider = null;
  state.rawEvmProvider = null;
  state.signer = null;
  state.walletAddress = null;
  state.walletChainId = null;
  state.connectedWalletKey = null;
  state.connectedWalletLabel = null;
  state.lastTracked = null;
  state.trackedPortfolio = [];
  state.trackedSummary = null;
  updateWalletStatus();
  setSwapStatus("Connect an EVM wallet to execute swaps.");
  renderParagraphList(elements.portfolioList, ["Connect wallet or track an address to view on-chain holdings."]);
}

function updateWalletStatus() {
  if (!state.walletAddress) {
    elements.walletStatus.textContent = "No wallet connected";
    return;
  }

  if (state.walletChainId) {
    const chain = getChainKeyByChainId(state.walletChainId);
    const chainLabel = getChainLabel(chain) || `Chain ${state.walletChainId}`;
    elements.walletStatus.textContent = `${state.connectedWalletLabel || "Wallet"} | ${shortenAddress(state.walletAddress)} | ${chainLabel}`;
    return;
  }

  elements.walletStatus.textContent = `${state.connectedWalletLabel || "Wallet"} | ${shortenAddress(state.walletAddress)} | Solana`;
}

async function sendEVM() {
  if (!state.signer) {
    setSwapStatus("Connect an EVM wallet before sending.");
    return;
  }

  const to = window.prompt("Recipient address");
  if (!to) {
    return;
  }

  const amount = window.prompt("Amount to send in native token");
  if (!amount) {
    return;
  }

  try {
    const tx = await state.signer.sendTransaction({
      to,
      value: parseEther(amount),
    });
    setSwapStatus(`Transfer submitted: ${tx.hash.slice(0, 10)}...`);
  } catch (error) {
    console.error(error);
    setSwapStatus(normalizeError(error, "Transfer failed."));
  }
}

async function loadTrackedPortfolio(addressArg, chainArg) {
  const address = (addressArg || elements.trackAddressInput.value || "").trim();
  const chain = chainArg || elements.trackChainSelect.value;

  if (!address) {
    renderParagraphList(elements.portfolioList, ["Enter a wallet address to track."]);
    return;
  }

  state.lastTracked = { address, chain };
  renderParagraphList(elements.portfolioList, [
    `Analyzing ${getChainLabel(chain)} wallet ${shortenAddress(address)}...`,
    "Scanning balances, exposure, and wallet behavior signals.",
  ]);
  renderParagraphList(elements.alertList, ["Analyzing previous wallet score and alerts..."]);
  renderParagraphList(elements.riskList, ["Analyzing on-chain risk profile..."]);
  await wait(900);

  try {
    const portfolio = chain === "solana"
      ? await loadSolanaPortfolio(address)
      : await loadEvmPortfolio(address, chain);

    state.trackedPortfolio = portfolio.assets;
    state.trackedSummary = portfolio.summary;
    persistAiTraderContext();
    renderPortfolio(portfolio.assets, portfolio.summary, address, chain);
    renderInsights(buildWalletInsights(portfolio.assets, portfolio.summary, chain, address));
  } catch (error) {
    console.error(error);
    renderParagraphList(elements.portfolioList, [normalizeError(error, "Portfolio lookup failed.")]);
    renderParagraphList(elements.riskList, ["Scoring paused until a wallet portfolio loads successfully."]);
  }
}

async function loadEvmPortfolio(address, chain) {
  const config = CHAIN_CONFIG[chain];
  if (!config) {
    throw new Error(`Unsupported chain: ${chain}`);
  }

  if (CONFIG.covalentApiKey) {
    const url = `https://api.covalenthq.com/v1/${config.covalentChain}/address/${address}/balances_v2/?nft=false&no-spam=true&quote-currency=USD&key=${encodeURIComponent(CONFIG.covalentApiKey)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Covalent request failed (${response.status})`);
    }

    const payload = await response.json();
    const items = payload?.data?.items || [];
    const assets = items
      .filter((item) => Number(item.balance || 0) > 0)
      .map((item) => ({
        symbol: item.contract_ticker_symbol || config.nativeSymbol,
        name: item.contract_name || item.contract_ticker_symbol || config.nativeSymbol,
        amount: Number(item.balance || 0) / 10 ** Number(item.contract_decimals || 18),
        valueUsd: Number(item.quote || 0),
        priceUsd: Number(item.quote_rate || 0),
        chain,
        type: item.type || "token",
      }))
      .sort((a, b) => b.valueUsd - a.valueUsd);

    return {
      assets,
      summary: summarizePortfolio(assets, chain, true, "indexed"),
    };
  }

  const provider = await getEvmReadProvider(chain);
  const nativeBalance = await provider.getBalance(address);
  const trackedTokens = Object.values(config.tokens);
  const priceMap = await safeFetchPriceMap(
    Array.from(new Set(trackedTokens.map((token) => token.coingeckoId).filter(Boolean))),
  );
  const nativeCoinId = config.tokens[config.nativeSymbol]?.coingeckoId || (chain === "bsc" ? "binancecoin" : "ethereum");
  const nativePrice = priceMap[nativeCoinId]?.usd || 0;
  const nativeAmount = Number(formatEther(nativeBalance));
  const assets = [{
    symbol: config.nativeSymbol,
    name: `${config.label} native`,
    amount: nativeAmount,
    valueUsd: nativeAmount * nativePrice,
    priceUsd: nativePrice,
    chain,
    type: "native",
  }];

  const tokenBalances = await Promise.all(
    trackedTokens
      .filter((token) => token.address !== config.nativeSymbol)
      .filter((token) => token.address !== "ETH" && token.address !== "BNB")
      .map(async (token) => {
        try {
          const contract = new Contract(token.address, ERC20_ABI, provider);
          const balance = await contract.balanceOf(address);
          if (balance === 0n) {
            return null;
          }

          const amount = Number(formatUnits(balance, token.decimals));
          const priceUsd = priceMap[token.coingeckoId]?.usd || 0;
          return {
            symbol: token.symbol,
            name: token.symbol,
            amount,
            valueUsd: amount * priceUsd,
            priceUsd,
            chain,
            type: "token",
          };
        } catch {
          return null;
        }
      }),
  );

  assets.push(...tokenBalances.filter(Boolean));
  assets.sort((a, b) => b.valueUsd - a.valueUsd);

  return {
    assets,
    summary: summarizePortfolio(assets, chain, false, "tracked-token-scan"),
  };
}

async function getEvmReadProvider(chain) {
  const config = CHAIN_CONFIG[chain];
  if (!config) {
    throw new Error(`Unsupported chain: ${chain}`);
  }

  const rpcUrls = Array.isArray(config.rpcUrls) && config.rpcUrls.length
    ? config.rpcUrls
    : [config.rpcUrl];
  let lastError = null;

  for (const rpcUrl of rpcUrls) {
    try {
      const provider = new JsonRpcProvider(rpcUrl, config.chainId, {
        staticNetwork: true,
      });
      await provider.getBlockNumber();
      return provider;
    } catch (error) {
      lastError = error;
      console.warn(`RPC failed for ${chain} via ${rpcUrl}`, error);
    }
  }

  throw new Error(
    `All ${config.label} RPC endpoints failed: ${normalizeError(lastError, `${config.label} RPC unavailable.`)}`,
  );
}

async function loadSolanaPortfolio(address) {
  const owner = new PublicKey(address);
  const { lamports, tokenAccounts } = await getSolanaAccountSnapshot(owner);

  const solPriceMap = await safeFetchPriceMap(["solana"]);
  const assets = [{
    symbol: "SOL",
    name: "Solana",
    amount: lamports / 1e9,
    valueUsd: (lamports / 1e9) * (solPriceMap.solana?.usd || 0),
    priceUsd: solPriceMap.solana?.usd || 0,
    chain: "solana",
    type: "native",
  }];

  tokenAccounts.value.forEach((accountInfo) => {
    const parsed = accountInfo.account.data.parsed.info;
    const tokenAmount = parsed.tokenAmount;
    const uiAmount = Number(tokenAmount.uiAmount || 0);
    if (!uiAmount) {
      return;
    }

    assets.push({
      symbol: parsed.mint.slice(0, 4),
      name: parsed.mint,
      amount: uiAmount,
      valueUsd: 0,
      priceUsd: 0,
      chain: "solana",
      type: "token",
    });
  });

  assets.sort((a, b) => b.valueUsd - a.valueUsd);
  return {
    assets,
    summary: summarizePortfolio(assets, "solana", false, "solana-rpc"),
  };
}

async function getSolanaAccountSnapshot(owner) {
  const endpoints = CHAIN_CONFIG.solana.rpcUrls || [CHAIN_CONFIG.solana.rpcUrl];
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const connection = new Connection(endpoint, "confirmed");
      const [lamports, tokenAccounts] = await Promise.all([
        connection.getBalance(owner),
        connection.getParsedTokenAccountsByOwner(owner, {
          programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        }),
      ]);

      return { lamports, tokenAccounts, endpoint };
    } catch (error) {
      lastError = error;
      console.warn(`Solana RPC failed for ${endpoint}`, error);
    }
  }

  throw new Error(
    `All Solana RPC endpoints failed for ${owner.toBase58()}: ${normalizeError(lastError, "Solana RPC unavailable.")}. You can set zendra_solanaRpc or VITE_SOLANA_RPC.`,
  );
}

function summarizePortfolio(assets, chain, hasFullTokenCoverage, coverageMode = "indexed") {
  const totalValueUsd = assets.reduce((sum, asset) => sum + (asset.valueUsd || 0), 0);
  const concentration = totalValueUsd
    ? ((assets[0]?.valueUsd || 0) / totalValueUsd) * 100
    : 0;
  const stableValue = assets
    .filter((asset) => ["USDC", "USDT", "DAI", "BUSD", "USDe"].includes(asset.symbol))
    .reduce((sum, asset) => sum + (asset.valueUsd || 0), 0);
  const stableShare = totalValueUsd ? (stableValue / totalValueUsd) * 100 : 0;

  return {
    chain,
    totalValueUsd,
    assetCount: assets.length,
    concentration,
    stableShare,
    hasFullTokenCoverage,
    coverageMode,
  };
}

function renderPortfolio(assets, summary, address, chain) {
  if (!assets.length) {
    renderParagraphList(elements.portfolioList, ["No on-chain assets found for this wallet."]);
    return;
  }

  const lines = assets.slice(0, 12).map((asset) => {
    const amount = compactNumber(asset.amount);
    const value = asset.valueUsd ? formatUsd(asset.valueUsd) : "price unavailable";
    return `${asset.symbol} | ${amount} | ${value}`;
  });

  if (summary.coverageMode === "tracked-token-scan" && chain !== "solana") {
    lines.unshift("Portfolio loaded from on-chain token scan across major assets on this network.");
  }

  renderParagraphList(elements.portfolioList, lines);
  elements.totalValue.textContent = formatUsd(summary.totalValueUsd);
  elements.portfolioChange.textContent = `${summary.assetCount} assets on ${getChainLabel(chain)}`;
  renderActivity([
    `Tracked ${shortenAddress(address)} on ${getChainLabel(chain)}.`,
    `Portfolio value snapshot: ${formatUsd(summary.totalValueUsd)}.`,
    `Coverage mode: ${formatCoverageMode(summary.coverageMode)}.`,
  ]);
}

function buildWalletInsights(assets, summary, chain, address) {
  const totalValue = summary.totalValueUsd;
  const memeShare = computeMemeShare(assets, totalValue);
  const smallPositionCount = assets.filter((asset) => (asset.valueUsd || 0) < 250).length;
  const stableShare = summary.stableShare;
  const concentration = summary.concentration;

  let label = "Balanced";
  let risk = "Normal";
  const alerts = [];
  const smartSignals = [];
  const aiNotes = [];

  if (totalValue > 100_000 && stableShare > 20 && concentration < 45) {
    label = "Smart Money";
    smartSignals.push("Large deployable capital with controlled concentration.");
  }

  if (memeShare > 35 || concentration > 65) {
    label = label === "Smart Money" ? "Aggressive Smart Money" : "High Risk";
    risk = "High";
    alerts.push("Portfolio is heavily concentrated in volatile or meme-linked positions.");
  }

  if (smallPositionCount >= 12) {
    risk = "High";
    alerts.push("Many small positions detected, which can indicate bot/sniper-style distribution.");
    smartSignals.push("Bot/Sniper likelihood elevated by wide low-value token spread.");
  }

  if (stableShare > 45) {
    smartSignals.push("Strong stablecoin reserve suggests active rotation capacity.");
  }

  if (chain === "solana") {
    aiNotes.push("Solana scoring uses native holdings and parsed SPL token balances.");
  } else if (summary.coverageMode === "tracked-token-scan") {
    aiNotes.push("EVM scoring is running from an on-chain scan of major tracked assets on this network.");
  } else {
    aiNotes.push("AI wallet scoring combines concentration, stable reserves, meme exposure, and position spread.");
  }

  aiNotes.push(`Wallet ${shortenAddress(address)} classified as ${label}.`);

  return {
    label,
    risk,
    alerts: alerts.length ? alerts : ["No critical risks detected from the current snapshot."],
    smartSignals: smartSignals.length ? smartSignals : ["No strong smart money pattern yet."],
    aiNotes,
    score: scoreWallet(summary, memeShare, smallPositionCount),
  };
}

function renderInsights(insights) {
  elements.smartSignals.textContent = String(insights.smartSignals.length);
  elements.alertsCount.textContent = String(insights.alerts.length);
  elements.riskScore.textContent = insights.risk;
  elements.riskSummary.textContent = `${insights.label} | Score ${insights.score}/100`;

  renderParagraphList(elements.alertList, insights.aiNotes);
  renderParagraphList(elements.riskList, insights.alerts);
  renderParagraphList(elements.smartMoneyList, insights.smartSignals);
  persistWalletInsights(insights);
  persistAiTraderContext(insights);
  Promise.resolve(persistWalletInsightsTo0G(insights)).catch((error) => {
    console.error("Wallet analysis store failed", error);
    setOgStorageStatus("0G storage failed.", "error");
  });
}

function scoreWallet(summary, memeShare, smallPositionCount) {
  let score = 50;
  score += Math.min(summary.assetCount * 3, 15);
  score += summary.stableShare > 25 ? 12 : 0;
  score -= summary.concentration > 60 ? 20 : 0;
  score -= memeShare > 35 ? 15 : 0;
  score -= Math.max(smallPositionCount - 10, 0) * 2;
  return Math.max(5, Math.min(95, Math.round(score)));
}

function computeMemeShare(assets, totalValue) {
  if (!totalValue) {
    return 0;
  }

  const memeValue = assets
    .filter((asset) => {
      const text = `${asset.symbol} ${asset.name}`.toLowerCase();
      return MEME_KEYWORDS.some((keyword) => text.includes(keyword));
    })
    .reduce((sum, asset) => sum + (asset.valueUsd || 0), 0);

  return (memeValue / totalValue) * 100;
}

async function loadMarketData() {
  const [pricesResult, trendingResult] = await Promise.allSettled([
    fetchCurrentPrices(),
    fetchTrendingTokens(),
  ]);

  if (pricesResult.status === "fulfilled") {
    state.marketPrices = pricesResult.value;
    renderCurrentPrices(pricesResult.value);
  } else {
    console.error("CoinGecko prices failed", pricesResult.reason);
    renderParagraphList(elements.priceList, [
      normalizeError(pricesResult.reason, "CoinGecko prices are unavailable right now."),
    ]);
  }

  if (trendingResult.status === "fulfilled") {
    state.trendingTokens = trendingResult.value;
    renderTrendingTokens(trendingResult.value);
  } else {
    console.error("CoinGecko trending failed", trendingResult.reason);
    renderParagraphList(elements.tokenList, [
      normalizeError(trendingResult.reason, "CoinGecko trending data is unavailable right now."),
    ]);
  }
}

async function fetchCurrentPrices() {
  const ids = DEFAULT_PRICE_COINS.join(",");
  const response = await fetchCoinGecko(`/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h&sparkline=false`);
  if (!response.ok) {
    throw new Error(await buildCoinGeckoError(response, "CoinGecko market request failed"));
  }

  return response.json();
}

async function fetchTrendingTokens() {
  const response = await fetchCoinGecko("/search/trending");
  if (!response.ok) {
    throw new Error(await buildCoinGeckoError(response, "CoinGecko trending request failed"));
  }

  const payload = await response.json();
  return (payload.coins || []).map((entry) => entry.item);
}

async function fetchPriceMap(ids) {
  const normalizedIds = Array.from(new Set((ids || []).filter(Boolean)));
  if (!normalizedIds.length) {
    return {};
  }

  const cached = getCachedPriceMap(normalizedIds);
  if (cached) {
    return cached;
  }

  const response = await fetchCoinGecko(`/simple/price?vs_currencies=usd&ids=${normalizedIds.join(",")}`);
  if (!response.ok) {
    throw new Error(await buildCoinGeckoError(response, "CoinGecko simple price request failed"));
  }

  const payload = await response.json();
  cachePriceMap(normalizedIds, payload);
  return payload;
}

function getCoinGeckoBaseUrl() {
  if (import.meta.env.DEV) {
    return CONFIG.coingeckoProApiKey
      ? "/api/coingecko-pro"
      : "/api/coingecko";
  }

  return CONFIG.coingeckoProApiKey
    ? "https://pro-api.coingecko.com/api/v3"
    : "https://api.coingecko.com/api/v3";
}

function getCoinGeckoHeaders() {
  const headers = {};
  if (CONFIG.coingeckoProApiKey) {
    headers["x-cg-pro-api-key"] = CONFIG.coingeckoProApiKey;
  } else if (CONFIG.coingeckoDemoApiKey) {
    headers["x-cg-demo-api-key"] = CONFIG.coingeckoDemoApiKey;
  }

  return headers;
}

async function fetchCoinGecko(path) {
  const url = `${getCoinGeckoBaseUrl()}${path}`;
  return fetch(url, {
    headers: getCoinGeckoHeaders(),
  });
}

function getCachedPriceMap(ids) {
  const now = Date.now();
  const result = {};
  let foundAll = true;

  ids.forEach((id) => {
    const entry = state.coinGeckoPriceCache.get(id);
    if (!entry || now - entry.timestamp > COINGECKO_PRICE_CACHE_TTL_MS) {
      foundAll = false;
      return;
    }

    result[id] = entry.value;
  });

  return foundAll ? result : null;
}

function cachePriceMap(ids, payload) {
  const timestamp = Date.now();
  ids.forEach((id) => {
    if (!payload[id]) {
      return;
    }

    state.coinGeckoPriceCache.set(id, {
      timestamp,
      value: payload[id],
    });
  });
}

function getStalePriceMap(ids) {
  const result = {};
  ids.forEach((id) => {
    const entry = state.coinGeckoPriceCache.get(id);
    if (entry?.value) {
      result[id] = entry.value;
    }
  });
  return result;
}

async function safeFetchPriceMap(ids) {
  const normalizedIds = Array.from(new Set((ids || []).filter(Boolean)));
  if (!normalizedIds.length) {
    return {};
  }

  try {
    return await fetchPriceMap(normalizedIds);
  } catch (error) {
    console.warn("CoinGecko price lookup failed, using cached or zero-price fallback.", error);
    return getStalePriceMap(normalizedIds);
  }
}

async function buildCoinGeckoError(response, fallback) {
  let details = "";
  try {
    details = await response.text();
  } catch {
    details = "";
  }

  const compactDetails = details.trim().slice(0, 180);
  return compactDetails
    ? `${fallback} (${response.status}): ${compactDetails}`
    : `${fallback} (${response.status})`;
}

function renderPricesLoading() {
  renderParagraphList(elements.priceList, ["Loading CoinGecko prices..."]);
}

function renderTrendingLoading() {
  renderParagraphList(elements.tokenList, ["Loading CoinGecko trending tokens..."]);
}

function renderCurrentPrices(prices) {
  if (!prices.length) {
    renderParagraphList(elements.priceList, ["No market prices available right now."]);
    return;
  }

  const lines = prices.slice(0, 7).map((coin) => {
    const change = Number(coin.price_change_percentage_24h || 0).toFixed(2);
    return `${coin.symbol.toUpperCase()} | ${formatUsd(coin.current_price)} | ${change}%`;
  });
  renderParagraphList(elements.priceList, lines);
  persistPriceAlerts(prices);
}

function renderTrendingTokens(tokens) {
  if (!tokens.length) {
    renderParagraphList(elements.tokenList, ["No trending token data available right now."]);
    return;
  }

  const lines = tokens.slice(0, 7).map((token) => {
    const price = Number(token.data?.price || 0);
    const change = Number(token.data?.price_change_percentage_24h?.usd || 0).toFixed(2);
    return `${token.symbol} | ${formatUsd(price)} | ${change}%`;
  });
  renderParagraphList(elements.tokenList, lines);
}

async function rerunInsights() {
  if (!state.trackedPortfolio.length || !state.trackedSummary || !state.lastTracked) {
    renderParagraphList(elements.alertList, ["Track a wallet first to run AI wallet scoring."]);
    return;
  }

  const insights = buildWalletInsights(
    state.trackedPortfolio,
    state.trackedSummary,
    state.lastTracked.chain,
    state.lastTracked.address,
  );
  renderInsights(insights);
  renderActivity([
    "AI wallet scoring refreshed.",
    `${insights.label} classification confirmed with score ${insights.score}/100.`,
    insights.alerts[0],
  ]);
}

async function swap() {
  if (!state.signer || !state.walletAddress) {
    setSwapStatus("Connect an EVM wallet before swapping.");
    return;
  }

  if (!CONFIG.zeroExApiKey) {
    setSwapStatus("Add VITE_ZERO_EX_API_KEY to .env.local, then restart the dev server to enable 0x swaps.");
    return;
  }

  const chain = elements.swapChain.value;
  const config = CHAIN_CONFIG[chain];
  if (!config) {
    setSwapStatus("Swap is only available on Ethereum, Arbitrum, and BSC.");
    return;
  }

  const activeChain = getChainKeyByChainId(state.walletChainId);
  if (activeChain !== chain) {
    const switched = await switchToChain(config.chainId);
    if (!switched) {
      return;
    }
  }

  const sellTokenInput = elements.swapFromToken.value.trim();
  const buyTokenInput = elements.swapToToken.value.trim();
  const sellAmountInput = elements.swapAmount.value.trim();
  const slippageInput = Number(elements.swapSlippage.value || "1");

  if (!sellTokenInput || !buyTokenInput || !sellAmountInput) {
    setSwapStatus("Enter the sell token, buy token, and amount.");
    return;
  }

  try {
    const sellToken = await resolveTokenInput(chain, sellTokenInput);
    const buyToken = await resolveTokenInput(chain, buyTokenInput);
    const sellAmount = parseUnits(sellAmountInput, sellToken.decimals).toString();

    setSwapStatus("Requesting 0x quote...");
    const quote = await fetchZeroExQuote(config, {
      chainId: String(config.chainId),
      sellToken: sellToken.address,
      buyToken: buyToken.address,
      sellAmount,
      taker: state.walletAddress,
      slippageBps: String(Math.round(slippageInput * 100)),
    });

    if (sellToken.address !== "ETH" && sellToken.address !== "BNB") {
      const spender = quote.issues?.allowance?.spender || quote.allowanceTarget;
      if (!spender) {
        throw new Error("0x quote did not return an allowance target.");
      }

      await ensureAllowance(sellToken.address, spender, sellAmount);
    }

    const tx = await state.signer.sendTransaction({
      to: quote.transaction.to,
      data: quote.transaction.data,
      value: quote.transaction.value ? BigInt(quote.transaction.value) : 0n,
      gasLimit: quote.transaction.gas ? BigInt(quote.transaction.gas) : undefined,
    });

    setSwapStatus(`Swap submitted: ${tx.hash.slice(0, 10)}... Expected buy amount ${formatUnits(quote.buyAmount, buyToken.decimals)} ${buyToken.symbol}.`);
    renderActivity([
      `0x swap sent on ${config.label}.`,
      `Selling ${sellAmountInput} ${sellToken.symbol} for ${buyToken.symbol}.`,
      `Transaction hash: ${tx.hash}`,
    ]);
  } catch (error) {
    console.error(error);
    setSwapStatus(normalizeError(error, "Swap failed."));
  }
}

async function fetchZeroExQuote(config, params) {
  const url = new URL("/swap/allowance-holder/quote", config.zeroExBaseUrl);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url.toString(), {
    headers: {
      "0x-api-key": CONFIG.zeroExApiKey,
      "0x-version": "v2",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`0x quote request failed (${response.status}): ${text}`);
  }

  return response.json();
}

async function ensureAllowance(tokenAddress, spender, amount) {
  const token = new Contract(tokenAddress, ERC20_ABI, state.signer);
  const currentAllowance = await token.allowance(state.walletAddress, spender);
  if (currentAllowance >= BigInt(amount)) {
    return;
  }

  setSwapStatus("Approving token spend...");
  const approvalTx = await token.approve(spender, amount);
  await approvalTx.wait();
}

async function resolveTokenInput(chain, input) {
  const config = CHAIN_CONFIG[chain];
  const upper = input.toUpperCase();

  if (config.tokens[upper]) {
    return config.tokens[upper];
  }

  if (/^0x[a-fA-F0-9]{40}$/.test(input)) {
    const provider = state.provider || new JsonRpcProvider(config.rpcUrl);
    const token = new Contract(input, ERC20_ABI, provider);
    const [symbol, decimals] = await Promise.all([token.symbol(), token.decimals()]);
    return {
      symbol,
      address: input,
      decimals: Number(decimals),
    };
  }

  throw new Error(`Unsupported token input: ${input}`);
}

async function switchToChain(chainId) {
  if (!state.rawEvmProvider) {
    setSwapStatus("Connect an EVM wallet before switching chains.");
    return false;
  }

  try {
    await state.rawEvmProvider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  } catch (error) {
    if (Number(error?.code) === 4902 && EVM_CHAIN_PARAMS[chainId]) {
      try {
        await state.rawEvmProvider.request({
          method: "wallet_addEthereumChain",
          params: [EVM_CHAIN_PARAMS[chainId]],
        });
        await state.rawEvmProvider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${chainId.toString(16)}` }],
        });
      } catch (addError) {
        setSwapStatus(normalizeError(addError, "Chain add/switch failed."));
        return false;
      }
    } else {
      setSwapStatus(normalizeError(error, "Chain switch failed."));
      return false;
    }
  }

  const walletDef = getWalletDefinition(state.connectedWalletKey || getPreferredWalletKey());
  if (walletDef?.provider && state.walletAddress) {
    await setConnectedEvmWallet(state.walletAddress, walletDef);
  }
  return true;
}

async function ensureOgStorageSigner() {
  if (!state.rawEvmProvider || !state.walletAddress) {
    throw new Error("Connect an EVM wallet before storing data on 0G.");
  }

  await refreshConnectedEvmNetworkState();

  if (!OG_COMPATIBLE_MAINNET_CHAIN_IDS.has(state.walletChainId)) {
    setSwapStatus("Switching wallet to 0G Mainnet for 0G storage...");
    const switched = await switchToChain(OG_MAINNET_CHAIN_ID);
    if (!switched) {
      throw new Error("Switch to 0G Mainnet was not completed.");
    }
  }

  if (!state.signer) {
    throw new Error("Wallet signer is unavailable after switching to 0G Mainnet.");
  }

  return state.signer;
}

async function refreshConnectedEvmNetworkState() {
  if (!state.provider || !state.walletAddress) {
    return;
  }

  state.walletChainId = state.rawEvmProvider
    ? await readInjectedChainId(state.rawEvmProvider)
    : Number((await state.provider.getNetwork()).chainId);
  state.provider = state.rawEvmProvider ? new BrowserProvider(state.rawEvmProvider) : state.provider;
  state.signer = state.rawEvmProvider ? await state.provider.getSigner() : state.signer;
  updateWalletStatus();
}

async function readInjectedChainId(provider) {
  const chainId = await provider.request?.({ method: "eth_chainId" });
  return parseChainId(chainId);
}

async function ensureEvmProviderOnOgMainnet(provider) {
  const chainId = await readInjectedChainId(provider);
  if (OG_COMPATIBLE_MAINNET_CHAIN_IDS.has(chainId)) {
    return true;
  }

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: EVM_CHAIN_PARAMS[OG_MAINNET_CHAIN_ID].chainId }],
    });
  } catch (error) {
    if (Number(error?.code) !== 4902) {
      throw error;
    }

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [EVM_CHAIN_PARAMS[OG_MAINNET_CHAIN_ID]],
    });
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: EVM_CHAIN_PARAMS[OG_MAINNET_CHAIN_ID].chainId }],
    });
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if ((await readInjectedChainId(provider)) === OG_MAINNET_CHAIN_ID) {
      return true;
    }

    await wait(250);
  }

  throw new Error("MetaMask is still not on 0G Mainnet 16661.");
}

function parseChainId(chainId) {
  if (typeof chainId === "number") {
    return chainId;
  }

  const value = String(chainId || "");
  return value.startsWith("0x") ? Number.parseInt(value, 16) : Number.parseInt(value, 10);
}

function renderActivity(lines) {
  renderParagraphList(elements.activityFeed, lines.map((line) => `${new Date().toLocaleTimeString()} | ${line}`));
}

function renderParagraphList(element, lines) {
  element.innerHTML = "";
  lines.forEach((line) => {
    const p = document.createElement("p");
    p.textContent = line;
    element.appendChild(p);
  });
}

function scrollToCard(selector) {
  document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getChainKeyByChainId(chainId) {
  return Object.entries(CHAIN_CONFIG).find(([, config]) => config.chainId === chainId)?.[0] || null;
}

function getChainLabel(chain) {
  return CHAIN_CONFIG[chain]?.label || "";
}

function setSwapStatus(message) {
  elements.swapStatus.textContent = message;
}

function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatUsd(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1 ? 2 : 6,
  }).format(Number(value || 0));
}

function compactNumber(value) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 3,
  }).format(Number(value || 0));
}

function formatCoverageMode(mode) {
  if (mode === "indexed") {
    return "full indexed holdings";
  }

  if (mode === "tracked-token-scan") {
    return "major-token on-chain scan";
  }

  if (mode === "solana-rpc") {
    return "solana rpc balances";
  }

  return mode;
}

function persistWalletInsights(insights) {
  if (!state.lastTracked?.address || !state.lastTracked?.chain) {
    return;
  }

  const timestamp = Date.now();
  const walletRecord = {
    timestamp,
    address: state.lastTracked.address,
    chain: state.lastTracked.chain,
    score: insights.score,
    label: insights.label,
  };
  const riskRecord = {
    timestamp,
    address: state.lastTracked.address,
    chain: state.lastTracked.chain,
    risk: insights.risk,
    topAlert: insights.alerts?.[0] || "No critical risks detected from the current snapshot.",
  };

  const lastWallet = state.ogStorage.walletScores[0];
  const isDuplicateWallet = lastWallet
    && lastWallet.address === walletRecord.address
    && lastWallet.chain === walletRecord.chain
    && lastWallet.score === walletRecord.score
    && lastWallet.label === walletRecord.label;
  if (!isDuplicateWallet) {
    prependOgRecord("walletScores", walletRecord);
  }

  const lastRisk = state.ogStorage.riskSnapshots[0];
  const isDuplicateRisk = lastRisk
    && lastRisk.address === riskRecord.address
    && lastRisk.chain === riskRecord.chain
    && lastRisk.risk === riskRecord.risk
    && lastRisk.topAlert === riskRecord.topAlert;
  if (!isDuplicateRisk) {
    prependOgRecord("riskSnapshots", riskRecord);
  }
}

async function persistWalletInsightsTo0G(insights) {
  if (!state.lastTracked?.address || !state.lastTracked?.chain) {
    setOgStorageStatus("Track a wallet to store its analysis on 0G.");
    return;
  }

  const issues = getOgBackupReadinessIssues();
  if (issues.length) {
    setOgStorageStatus("0G storage ready when wallet connection and RPC config are available.");
    return;
  }

  const assets = state.trackedPortfolio.slice(0, 12).map((asset) => ({
    symbol: asset.symbol,
    name: asset.name,
    amount: asset.amount,
    valueUsd: asset.valueUsd,
    priceUsd: asset.priceUsd,
    chain: asset.chain,
    type: asset.type,
  }));

  try {
    setOgStorageStatus("Storing wallet analysis on 0G...", "pending");
    const signer = await ensureOgStorageSigner();
    const { rootHash, txHash, anchorTxHash } = await storeWalletAnalysisResults({
      address: state.lastTracked.address,
      chain: state.lastTracked.chain,
      summary: state.trackedSummary,
      assets,
      insights,
      indexerRpc: CONFIG.ogIndexerRpc,
      evmRpc: CONFIG.ogEvmRpc,
      proofAnchorAddress: CONFIG.ogProofAnchorContract,
      signer,
    });

    console.log("0G wallet analysis root hash:", rootHash);
    console.log("0G wallet analysis transaction hash:", txHash);
    console.log("0G proof anchor transaction hash:", anchorTxHash);

    state.ogLastBackupMeta = {
      timestamp: Date.now(),
      txHash,
      anchorTxHash,
      rootHash,
      reason: "wallet-analysis",
      address: state.lastTracked.address,
    };
    window.localStorage.setItem(OG_BACKUP_META_KEY, JSON.stringify(state.ogLastBackupMeta));
    setOgStorageStatus("Stored on 0G", "success");
    renderStoredOgData();
  } catch (error) {
    console.error("Wallet analysis store failed", error);
    setOgStorageStatus(normalizeError(error, "0G storage failed."), "error");
  }
}

function setOgStorageStatus(message, tone = "muted") {
  if (!elements.ogStorageStatus) {
    return;
  }

  elements.ogStorageStatus.textContent = message;
  elements.ogStorageStatus.dataset.tone = tone;
}

function persistPriceAlerts(prices) {
  const threshold = 5;
  const timestamp = Date.now();
  prices.forEach((coin) => {
    const change = Number(coin.price_change_percentage_24h || 0);
    if (Math.abs(change) < threshold) {
      return;
    }

    const symbol = String(coin.symbol || "").toUpperCase();
    const direction = change >= 0 ? "up" : "down";
    const recentDuplicate = state.ogStorage.priceAlerts.find((item) => (
      item.symbol === symbol
      && item.direction === direction
      && Math.abs(timestamp - Number(item.timestamp || 0)) < 30 * 60 * 1000
    ));
    if (recentDuplicate) {
      return;
    }

    prependOgRecord("priceAlerts", {
      timestamp,
      symbol,
      direction,
      change,
      changeText: `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`,
      price: Number(coin.current_price || 0),
      priceText: formatUsd(Number(coin.current_price || 0)),
    });
  });
}

function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString();
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function normalizeError(error, fallbackMessage) {
  return error?.shortMessage || error?.reason || error?.message || fallbackMessage;
}

function persistAiTraderContext(insights = null) {
  if (!state.lastTracked?.address || !state.lastTracked?.chain) {
    return;
  }

  const payload = {
    wallet: state.lastTracked,
    summary: state.trackedSummary,
    assets: state.trackedPortfolio.slice(0, 12),
    insights,
    updatedAt: Date.now(),
  };
  window.localStorage.setItem(AI_TRADER_CONTEXT_KEY, JSON.stringify(payload));
}

function openAiTraderPage() {
  window.location.href = "/ai-trader.html";
}
