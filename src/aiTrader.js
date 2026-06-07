import "./style.css";
import { BrowserProvider } from "ethers";
import {
  buildAiMentorMessages,
  createTimestampedMessage,
  loadAiMentorState,
  saveAiMentorState,
  summarizeTrackedContext,
} from "./services/aiMentor.ts";
import {
  getOgComputeConfig,
  createOgComputeBroker,
  listOgComputeProviders,
  resolveOgChatProvider,
  runOgDirectChatCompletion,
  saveOgComputeConfig,
  fundOgComputeProvider,
} from "./services/ogCompute.ts";
import {
  getBrowserOgStorageSupportIssue,
  storeAiChatHistory,
  storeAiContextMemory,
  storeStrategyMemory,
  storeTradeAnalysisLog,
  storeTradeJournal,
  storeUserPreferences,
} from "./services/ogStorage.ts";

const OG_MAINNET_CHAIN_ID = 16661;
const OG_MAINNET_CHAIN_IDS = new Set([OG_MAINNET_CHAIN_ID]);
const DEFAULT_OG_PROOF_ANCHOR_CONTRACT = "0x61c60b1A07b55a23776dDe639933Aa01A5156c55";
const OG_MAINNET_CHAIN_PARAMS = {
  chainId: "0x4115",
  chainName: "0G Mainnet",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: ["https://evmrpc.0g.ai"],
  blockExplorerUrls: ["https://chainscan.0g.ai"],
};
const OG_INDEXER_RPC_KEY = "zendra_ogIndexerRpc";
const OG_EVM_RPC_KEY = "zendra_ogEvmRpc";
const OG_PROOF_ANCHOR_CONTRACT_KEY = "zendra_ogProofAnchorContract";
const AI_MENTOR_ONBOARDING_KEY = "zendra_ai_mentor_onboarding_seen_v1";

const ONBOARDING_STEPS = [
  {
    title: "Meet Your AI Trading Mentor",
    description: "Use the mentor like a thoughtful trading copilot. Ask normal questions, explore setups, and get coaching before acting.",
    points: [
      "Ask about market direction, risk, entries, invalidation, or psychology.",
      "Use quick prompts if you do not know how to start.",
      "Treat it like guidance, not guaranteed signals.",
    ],
  },
  {
    title: "What The AI Can Help With",
    description: "The mentor is most useful when you want structured thinking instead of random opinions.",
    points: [
      "Analyze trends and explain what matters now.",
      "Turn rough trade ideas into cleaner swing plans.",
      "Improve discipline, sizing, and stop-loss logic.",
    ],
  },
  {
    title: "How Memory Works",
    description: "You can save preferences, strategy notes, and journal lessons so the mentor becomes more personalized over time.",
    points: [
      "User Preferences shape the type of guidance you get.",
      "Trading Strategy stores the playbook you want refined.",
      "Trade Journal stores lessons, mistakes, and behavior patterns.",
    ],
  },
  {
    title: "Quick Start",
    description: "Best first move: connect your wallet if you want storage, then try one of the suggested prompts.",
    points: [
      "Start with Analyze BTC Trend or Create Swing Plan.",
      "Save memory only when you want persistence on 0G Storage.",
      "Come back to this guide anytime from the sidebar.",
    ],
  },
];

const state = {
  messages: [],
  memory: "",
  strategy: "",
  journal: "",
  trackedContext: null,
  providerCatalog: [],
  computeBroker: null,
  signer: null,
  walletAddress: null,
  walletChainId: null,
  provider: null,
  rawEvmProvider: null,
  activeStreamController: null,
  sessionId: `mentor-session-${Date.now()}`,
  latestAnalysis: "",
  latestReadiness: null,
  readinessRequestId: 0,
  onboardingStep: 0,
};

const discoveredEvmWallets = new Map();
let eip6963Initialized = false;
let traderWalletListenersBound = false;

const elements = {
  ogComputeRpcUrlInput: document.getElementById("ogComputeRpcUrlInput"),
  ogComputeModelInput: document.getElementById("ogComputeModelInput"),
  ogComputeProviderAddressInput: document.getElementById("ogComputeProviderAddressInput"),
  ogComputeFundAmountInput: document.getElementById("ogComputeFundAmountInput"),
  mentorPromptInput: document.getElementById("mentorPromptInput"),
  mentorChatMessages: document.getElementById("mentorChatMessages"),
  mentorTrackedContext: document.getElementById("mentorTrackedContext"),
  mentorIdentityOutput: document.getElementById("mentorIdentityOutput"),
  mentorOnboardingModal: document.getElementById("mentorOnboardingModal"),
  mentorOnboardingTitle: document.getElementById("mentorOnboardingTitle"),
  mentorOnboardingDescription: document.getElementById("mentorOnboardingDescription"),
  mentorOnboardingPoints: document.getElementById("mentorOnboardingPoints"),
  mentorOnboardingNextButton: document.getElementById("mentorOnboardingNextButton"),
  mentorMemoryInput: document.getElementById("mentorMemoryInput"),
  mentorStrategyInput: document.getElementById("mentorStrategyInput"),
  mentorJournalInput: document.getElementById("mentorJournalInput"),
  mentorReadinessOutput: document.getElementById("mentorReadinessOutput"),
  mentorAnalysisOutput: document.getElementById("mentorAnalysisOutput"),
  mentorComputeOutput: document.getElementById("mentorComputeOutput"),
  mentorProviderOutput: document.getElementById("mentorProviderOutput"),
  mentorStatus: document.getElementById("mentorStatus"),
  mentorWalletStatus: document.getElementById("mentorWalletStatus"),
};

window.goToDashboard = () => {
  window.location.href = "/";
};
window.connectTraderWallet = () => connectTraderWallet();
window.saveMentorSettings = () => saveMentorSettings();
window.sendMentorPrompt = () => sendMentorPrompt();
window.usePromptChip = (prompt) => usePromptChip(prompt);
window.clearMentorChat = () => clearMentorChat();
window.openMentorOnboarding = () => openMentorOnboarding();
window.closeMentorOnboarding = () => closeMentorOnboarding();
window.nextMentorOnboardingStep = () => nextMentorOnboardingStep();
window.prevMentorOnboardingStep = () => prevMentorOnboardingStep();
window.savePreferencesTo0G = () => savePreferencesTo0G();
window.saveStrategyTo0G = () => saveStrategyTo0G();
window.saveJournalTo0G = () => saveJournalTo0G();
window.saveChatHistoryTo0G = () => saveChatHistoryTo0G();
window.refreshProviders = () => refreshProviders();
window.fundSelectedComputeProvider = () => fundSelectedComputeProvider();

bootstrap();

function bootstrap() {
  enforceMainnetRuntimeConfig();
  initEip6963WalletDiscovery();
  hydrateState();
  bindComposerShortcuts();
  renderTrackedContext();
  renderMessages();
  renderAnalysis();
  renderComputeInfo();
  renderProviderInfo();
  renderIdentityPanel();
  renderMentorReadiness();
  updateWalletStatus();
  maybeOpenOnboarding();
  refreshProviders().catch((error) => {
    console.error(error);
    setMentorStatus(normalizeError(error, "Unable to load 0G providers right now."), "error");
  });
}

function hydrateState() {
  const mentorState = loadAiMentorState();
  state.messages = Array.isArray(mentorState.messages) ? mentorState.messages : [];
  state.memory = mentorState.memory || "";
  state.strategy = mentorState.strategy || "";
  state.journal = mentorState.journal || "";
  state.trackedContext = mentorState.trackedContext || null;

  const config = getOgComputeConfig();
  elements.ogComputeRpcUrlInput.value = "https://evmrpc.0g.ai";
  elements.ogComputeModelInput.value = config.model || "";
  elements.ogComputeProviderAddressInput.value = config.providerAddress || "";
  elements.mentorMemoryInput.value = state.memory;
  elements.mentorStrategyInput.value = state.strategy;
  elements.mentorJournalInput.value = state.journal;

  const lastAssistant = [...state.messages].reverse().find((entry) => entry.role === "assistant");
  state.latestAnalysis = lastAssistant?.content || "";
}

function saveMentorSettings() {
  state.memory = elements.mentorMemoryInput.value.trim();
  state.strategy = elements.mentorStrategyInput.value.trim();
  state.journal = elements.mentorJournalInput.value.trim();

  saveAiMentorState({
    memory: state.memory,
    strategy: state.strategy,
    journal: state.journal,
  });
  saveOgComputeConfig({
    rpcUrl: "https://evmrpc.0g.ai",
    model: elements.ogComputeModelInput.value,
    providerAddress: elements.ogComputeProviderAddressInput.value,
  });
  elements.ogComputeRpcUrlInput.value = "https://evmrpc.0g.ai";

  setMentorStatus("Mentor settings saved locally.", "success");
  renderComputeInfo();
  renderProviderInfo();
  renderIdentityPanel();
  renderMentorReadiness();
}

async function connectTraderWallet() {
  const injectedProvider = findMetaMaskProvider() || getPrimaryInjectedProvider();
  if (!injectedProvider) {
    setMentorStatus("Install MetaMask or another EVM wallet before storing mentor data on 0G.", "error");
    return;
  }

  try {
    await ensureInjectedProviderOnOgMainnet(injectedProvider);
    const provider = new BrowserProvider(injectedProvider);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const chainId = await readInjectedChainId(injectedProvider);

    state.rawEvmProvider = injectedProvider;
    state.provider = provider;
    state.signer = signer;
    state.walletAddress = await signer.getAddress();
    state.walletChainId = chainId;
    state.computeBroker = await createOgComputeBroker(signer);
    bindTraderWalletListeners(injectedProvider);
    updateWalletStatus();
    renderIdentityPanel();
    setMentorStatus(injectedProvider.isMetaMask ? "MetaMask connected." : "Trader wallet connected.", "success");
    await refreshProviders();
    await renderMentorReadiness();
  } catch (error) {
    console.error(error);
    setMentorStatus(
      normalizeError(error, "Connect a wallet on 0G Compute's supported network before using the AI mentor."),
      "error",
    );
  }
}

function bindTraderWalletListeners(provider) {
  if (!provider || traderWalletListenersBound) {
    return;
  }

  traderWalletListenersBound = true;
  provider.on?.("chainChanged", async (chainId) => {
    const parsedChainId = parseChainId(chainId);
    if (!OG_MAINNET_CHAIN_IDS.has(parsedChainId)) {
      state.walletChainId = null;
      setMentorStatus("Wrong 0G network detected. Switching to 0G Mainnet...", "pending");
    }
    await refreshTraderWalletState();
  });
  provider.on?.("accountsChanged", async (accounts) => {
    if (!Array.isArray(accounts) || !accounts.length) {
      state.signer = null;
      state.walletAddress = null;
      state.walletChainId = null;
      state.computeBroker = null;
      updateWalletStatus();
      renderIdentityPanel();
      await renderMentorReadiness();
      return;
    }

    state.walletAddress = accounts[0];
    await refreshTraderWalletState();
  });
}

async function refreshTraderWalletState() {
  if (!state.rawEvmProvider) {
    return;
  }

  await ensureInjectedProviderOnOgMainnet(state.rawEvmProvider);
  state.provider = new BrowserProvider(state.rawEvmProvider);
  state.signer = await state.provider.getSigner();
  state.walletAddress = await state.signer.getAddress();
  state.walletChainId = await readInjectedChainId(state.rawEvmProvider);
  state.computeBroker = await createOgComputeBroker(state.signer);
  updateWalletStatus();
  renderIdentityPanel();
  await renderMentorReadiness();
}

async function ensureInjectedProviderOnOgMainnet(provider) {
  const chainId = await readInjectedChainId(provider);
  if (OG_MAINNET_CHAIN_IDS.has(chainId)) {
    return true;
  }

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: OG_MAINNET_CHAIN_PARAMS.chainId }],
    });
  } catch (error) {
    if (Number(error?.code) !== 4902) {
      throw error;
    }

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [OG_MAINNET_CHAIN_PARAMS],
    });
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: OG_MAINNET_CHAIN_PARAMS.chainId }],
    });
  }

  await waitForInjectedChainId(provider, OG_MAINNET_CHAIN_ID);
  return true;
}

async function waitForInjectedChainId(provider, expectedChainId) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const chainId = await readInjectedChainId(provider);
    if (chainId === expectedChainId) {
      return true;
    }

    await wait(250);
  }

  const chainId = await readInjectedChainId(provider);
  throw new Error(`MetaMask is still on chain ${chainId}. Remove the old 0G Galileo network and switch to 0G Mainnet 16661.`);
}

function enforceMainnetRuntimeConfig() {
  ["zendra_ogComputeRpcUrl", "zendra_ogIndexerRpc", "zendra_ogEvmRpc"].forEach((key) => {
    const value = window.localStorage.getItem(key);
    if (!value || value.toLowerCase().includes("testnet") || value.toLowerCase().includes("galileo")) {
      window.localStorage.removeItem(key);
    }
  });
}

async function readInjectedChainId(provider) {
  const chainId = await provider.request?.({ method: "eth_chainId" });
  return parseChainId(chainId);
}

function parseChainId(chainId) {
  if (typeof chainId === "number") {
    return chainId;
  }

  const value = String(chainId || "");
  return value.startsWith("0x") ? Number.parseInt(value, 16) : Number.parseInt(value, 10);
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

function updateWalletStatus() {
  if (!state.walletAddress) {
    elements.mentorWalletStatus.textContent = "No wallet connected";
    renderIdentityPanel();
    return;
  }

  const chainLabel = OG_MAINNET_CHAIN_IDS.has(state.walletChainId)
    ? "0G Mainnet"
    : "Wrong network";
  elements.mentorWalletStatus.textContent = `${shortenAddress(state.walletAddress)} | ${chainLabel}`;
  renderIdentityPanel();
}

async function sendMentorPrompt() {
  const prompt = elements.mentorPromptInput.value.trim();
  if (!prompt) {
    renderAnalysis(["Ask the mentor something so it has context to respond to."]);
    return;
  }
  const readiness = await assessMentorReadiness();
  state.latestReadiness = readiness;
  renderMentorReadiness(readiness);

  if (!readiness.ready) {
    setMentorStatus(readiness.statusMessage || "Direct 0G Compute is not ready yet.", "error");
    return;
  }

  saveMentorSettings();
  if (state.activeStreamController) {
    state.activeStreamController.abort();
  }

  const userMessage = createTimestampedMessage("user", prompt);
  state.messages.push(userMessage);
  elements.mentorPromptInput.value = "";
  saveAiMentorState({ messages: state.messages });
  renderMessages();
  setMentorStatus("Running inference through 0G Compute...", "pending");

  const placeholderMessage = createTimestampedMessage("assistant", "");
  state.messages.push(placeholderMessage);
  renderMessages();

  const controller = new AbortController();
  state.activeStreamController = controller;

  try {
    const messages = buildAiMentorMessages({
      messages: state.messages.slice(0, -1).map((entry) => ({ role: entry.role, content: entry.content })),
      memory: state.memory,
      strategy: state.strategy,
      journal: state.journal,
      trackedContext: state.trackedContext,
    });

    const result = await runOgDirectChatCompletion({
      signer: state.signer,
      messages,
      preferredProviderAddress: elements.ogComputeProviderAddressInput.value.trim() || undefined,
      preferredModel: elements.ogComputeModelInput.value.trim() || undefined,
      signal: controller.signal,
    });
    placeholderMessage.content = result.text || "The mentor did not return any text.";

    state.latestAnalysis = placeholderMessage.content;
    saveAiMentorState({ messages: state.messages });
    renderMessages();
    renderAnalysis();
    renderComputeInfo(result);
    renderProviderInfo(result);
    await renderMentorReadiness();
    setMentorStatus("0G Compute response received.", "success");

    await persistMentorArtifacts({
      usage: result.usage,
      model: result.model,
      endpoint: result.endpoint,
      assistantText: placeholderMessage.content,
      providerAddress: result.providerAddress,
      verification: result.verification,
      chatId: result.chatId,
    });
  } catch (error) {
    console.error(error);
    state.messages.pop();
    saveAiMentorState({ messages: state.messages });
    renderMessages();
    const friendlyError = toMentorErrorMessage(error);
    renderAnalysis([friendlyError]);
    setMentorStatus(friendlyError, "error");
    await renderMentorReadiness();
  } finally {
    state.activeStreamController = null;
  }
}

async function persistMentorArtifacts({ usage, model, endpoint, assistantText, providerAddress, verification, chatId }) {
  if (!state.signer || !OG_MAINNET_CHAIN_IDS.has(state.walletChainId)) {
    return;
  }

  const config = getStorageConfig();

  await Promise.allSettled([
    storeTradeAnalysisLog({
      log: {
        sessionId: state.sessionId,
        model,
        endpoint,
        usage,
        assistantText,
        providerAddress,
        verification,
        chatId,
        trackedWallet: state.trackedContext?.wallet || null,
      },
      ...config,
      signer: state.signer,
    }),
    storeAiContextMemory({
      context: {
        memory: state.memory,
        strategy: state.strategy,
        journal: state.journal,
        trackedContext: state.trackedContext,
      },
      ...config,
      signer: state.signer,
    }),
  ]);
}

async function savePreferencesTo0G() {
  saveMentorSettings();
  if (!state.memory) {
    setMentorStatus("Add user preferences before storing them on 0G.", "error");
    return;
  }

  try {
    const signer = await requireStorageSigner();
    const { rootHash, txHash } = await storeUserPreferences({
      preferences: {
        text: state.memory,
        trackedWallet: state.trackedContext?.wallet || null,
      },
      ...getStorageConfig(),
      signer,
    });
    setMentorStatus(`Preferences stored on 0G. Root ${shortHash(rootHash)} | Tx ${shortHash(txHash)}`, "success");
  } catch (error) {
    console.error(error);
    setMentorStatus(normalizeError(error, "Failed to store preferences."), "error");
  }
}

async function saveStrategyTo0G() {
  saveMentorSettings();
  if (!state.strategy) {
    setMentorStatus("Add a strategy before storing it on 0G.", "error");
    return;
  }

  try {
    const signer = await requireStorageSigner();
    const { rootHash, txHash } = await storeStrategyMemory({
      memory: {
        text: state.strategy,
        preferences: state.memory,
      },
      ...getStorageConfig(),
      signer,
    });
    setMentorStatus(`Strategy stored on 0G. Root ${shortHash(rootHash)} | Tx ${shortHash(txHash)}`, "success");
  } catch (error) {
    console.error(error);
    setMentorStatus(normalizeError(error, "Failed to store strategy."), "error");
  }
}

async function saveJournalTo0G() {
  saveMentorSettings();
  if (!state.journal) {
    setMentorStatus("Add journal notes before storing them on 0G.", "error");
    return;
  }

  try {
    const signer = await requireStorageSigner();
    const { rootHash, txHash } = await storeTradeJournal({
      journal: {
        text: state.journal,
        trackedWallet: state.trackedContext?.wallet || null,
      },
      ...getStorageConfig(),
      signer,
    });
    setMentorStatus(`Journal stored on 0G. Root ${shortHash(rootHash)} | Tx ${shortHash(txHash)}`, "success");
  } catch (error) {
    console.error(error);
    setMentorStatus(normalizeError(error, "Failed to store journal."), "error");
  }
}

async function saveChatHistoryTo0G() {
  if (!state.messages.length) {
    setMentorStatus("Run at least one mentor conversation before storing chat history.", "error");
    return;
  }

  try {
    const signer = await requireStorageSigner();
    const { rootHash, txHash } = await storeAiChatHistory({
      sessionId: state.sessionId,
      messages: state.messages,
      metadata: {
        trackedWallet: state.trackedContext?.wallet || null,
      },
      ...getStorageConfig(),
      signer,
    });
    setMentorStatus(`Chat history stored on 0G. Root ${shortHash(rootHash)} | Tx ${shortHash(txHash)}`, "success");
  } catch (error) {
    console.error(error);
    setMentorStatus(normalizeError(error, "Failed to store chat history."), "error");
  }
}

async function requireStorageSigner() {
  const browserStorageIssue = getBrowserOgStorageSupportIssue();
  if (browserStorageIssue) {
    throw new Error(browserStorageIssue);
  }

  if (!state.signer || !state.walletAddress) {
    throw new Error("Connect a trader wallet before storing mentor data on 0G.");
  }

  if (!OG_MAINNET_CHAIN_IDS.has(state.walletChainId)) {
    setMentorStatus("Switching trader wallet to 0G Mainnet...", "pending");
    const switched = await switchTraderWalletToOgMainnet();
    if (!switched) {
      throw new Error("Switch the trader wallet to 0G Mainnet before storing mentor data.");
    }
  }

  return state.signer;
}

async function switchTraderWalletToOgMainnet() {
  if (!state.rawEvmProvider || !state.provider) {
    setMentorStatus("Connect MetaMask before switching to 0G Mainnet.", "error");
    return false;
  }

  try {
    await ensureInjectedProviderOnOgMainnet(state.rawEvmProvider);
    await refreshTraderWalletState();
    state.computeBroker = await createOgComputeBroker(state.signer);
    setMentorStatus("Trader wallet switched to 0G Mainnet.", "success");
    return OG_MAINNET_CHAIN_IDS.has(state.walletChainId);
  } catch (error) {
    setMentorStatus(normalizeError(error, "0G Mainnet switch failed."), "error");
    return false;
  }
}

function getStorageConfig() {
  return {
    indexerRpc: normalizeMainnetStorageRpc(
      window.localStorage.getItem(OG_INDEXER_RPC_KEY),
      "https://indexer-storage-turbo.0g.ai",
    ),
    evmRpc: normalizeMainnetStorageRpc(window.localStorage.getItem(OG_EVM_RPC_KEY), "https://evmrpc.0g.ai"),
    proofAnchorAddress: normalizeProofAnchorContract(window.localStorage.getItem(OG_PROOF_ANCHOR_CONTRACT_KEY)),
  };
}

function normalizeProofAnchorContract(value) {
  const normalized = String(value || "").trim();
  return /^0x[a-fA-F0-9]{40}$/.test(normalized)
    ? normalized
    : DEFAULT_OG_PROOF_ANCHOR_CONTRACT;
}

function normalizeMainnetStorageRpc(value, fallback) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.includes("testnet")) {
    return fallback;
  }

  return normalized;
}

function renderTrackedContext() {
  renderParagraphList(elements.mentorTrackedContext, summarizeTrackedContext(state.trackedContext));
}

function renderMessages() {
  if (!state.messages.length) {
    elements.mentorChatMessages.innerHTML = `
      <div class="ai-empty-state">
        <h3>Start Your First Conversation</h3>
        <p>Ask about market trends, build a swing plan, improve trading discipline, or explore risk before entering a position.</p>
        <div class="ai-empty-state-actions">
          <button type="button" onclick="usePromptChip('Analyze BTC trend and tell me what matters most before I look for an entry.')">Analyze BTC Trend</button>
          <button type="button" onclick="usePromptChip('Create a swing trade plan for me with entry ideas, invalidation, and what to watch next.')">Create Swing Plan</button>
          <button type="button" onclick="openMentorOnboarding()">Open Onboarding</button>
        </div>
      </div>
    `;
    return;
  }

  elements.mentorChatMessages.innerHTML = "";
  state.messages.forEach((message) => {
    const card = document.createElement("div");
    card.className = `ai-chat-message ai-chat-${message.role}`;
    const label = document.createElement("strong");
    label.textContent = message.role === "assistant" ? "AI Mentor" : "You";
    const text = document.createElement("p");
    text.textContent = message.content || (message.role === "assistant" ? "Thinking..." : "");
    card.append(label, text);
    elements.mentorChatMessages.appendChild(card);
  });
  elements.mentorChatMessages.scrollTop = elements.mentorChatMessages.scrollHeight;
}

function renderAnalysis(lines = null) {
  const outputLines = Array.isArray(lines)
    ? lines
    : state.latestAnalysis
      ? splitIntoParagraphs(state.latestAnalysis)
      : ["The mentor will summarize the latest response and streaming status here."];
  renderParagraphList(elements.mentorAnalysisOutput, outputLines);
}

async function renderMentorReadiness(readiness = null) {
  const requestId = ++state.readinessRequestId;
  const resolvedReadiness = readiness || await assessMentorReadiness();
  if (requestId !== state.readinessRequestId) {
    return;
  }

  state.latestReadiness = resolvedReadiness;
  elements.mentorReadinessOutput.dataset.tone = resolvedReadiness.tone || "muted";
  renderParagraphList(elements.mentorReadinessOutput, resolvedReadiness.lines);
  renderIdentityPanel();
}

async function assessMentorReadiness() {
  const config = getOgComputeConfig();
  const lines = [];
  const issues = [];
  const warnings = [];
  const preferredProvider = elements.ogComputeProviderAddressInput.value.trim();
  let resolvedProvider = null;
  let providerAccount = null;

  lines.push(`Compute RPC: ${config.rpcUrl || "https://evmrpc.0g.ai"}`);
  lines.push(`Model selection: ${config.model || "provider default"}`);

  if (!state.walletAddress || !state.signer) {
    issues.push("Connect MetaMask before using the AI mentor. Direct 0G Compute signs each request with your wallet.");
  } else {
    const chainLabel = OG_MAINNET_CHAIN_IDS.has(state.walletChainId) ? "0G Mainnet" : "wrong network";
    lines.push(`Wallet connected: ${shortenAddress(state.walletAddress)} on ${chainLabel}`);
  }

  if (state.walletAddress && !OG_MAINNET_CHAIN_IDS.has(state.walletChainId)) {
    issues.push("Switch the trader wallet to 0G Mainnet before sending mentor prompts.");
  }

  if (!state.providerCatalog.length) {
    warnings.push("No provider list loaded yet. Click Refresh Providers so the mentor can choose a healthy 0G chatbot provider.");
  } else {
    try {
      resolvedProvider = await resolveOgChatProvider({
        signer: state.signer || undefined,
        preferredProviderAddress: preferredProvider || undefined,
      });
      lines.push(`Provider ready: ${resolvedProvider.providerAddress}`);
      lines.push(`Provider health: ${resolvedProvider.service?.healthMetrics?.status || "unknown"}`);
      lines.push(`Provider endpoint: ${resolvedProvider.endpoint}`);
      lines.push(`Provider model: ${resolvedProvider.model || "metadata unavailable"}`);
      if (config.model && resolvedProvider.model && config.model !== resolvedProvider.model) {
        warnings.push(
          `Configured model override ${config.model} does not match this provider. The mentor will use ${resolvedProvider.model} instead.`,
        );
      }
    } catch (error) {
      issues.push(normalizeError(error, "Unable to resolve a 0G chatbot provider."));
    }
  }

  if (preferredProvider && resolvedProvider && preferredProvider.toLowerCase() !== resolvedProvider.providerAddress.toLowerCase()) {
    warnings.push("The preferred provider was not selected. Check the address or refresh provider metadata.");
  }

  if (state.computeBroker && resolvedProvider?.providerAddress) {
    try {
      providerAccount = await state.computeBroker.inference.getAccount(resolvedProvider.providerAddress);
      const balance = normalizeProviderBalance(providerAccount?.balance);
      lines.push(`Provider sub-account balance: ${providerAccount?.balance ?? "unknown"}`);
      if (balance <= 0) {
        issues.push("Fund the selected provider sub-account before chatting. Direct 0G Compute will reject unfunded requests.");
      }
    } catch (error) {
      const accountError = normalizeError(error, "");
      if (String(accountError).toLowerCase().includes("sub-account not found")) {
        issues.push("This provider has no compute sub-account for your wallet yet. Transfer funds to the provider sub-account first.");
        lines.push(`Provider sub-account: missing for ${shortenAddress(state.walletAddress || "wallet")}`);
      } else {
        warnings.push("Provider sub-account balance could not be inspected yet. Connect wallet and refresh providers after funding.");
      }
    }
  } else if (state.signer) {
    warnings.push("Connect to a specific provider by refreshing providers so the mentor can inspect provider balance.");
  }

  if (resolvedProvider?.providerAddress && state.signer) {
    lines.push("TEE response verification: available after a successful reply.");
  } else {
    warnings.push("TEE verification will be available after a provider is resolved with a connected wallet.");
  }

  warnings.forEach((warning) => lines.push(`Warning: ${warning}`));
  issues.forEach((issue) => lines.push(`Blocked: ${issue}`));

  if (!issues.length) {
    lines.unshift("Ready to chat through 0G Compute.");
  } else {
    lines.unshift("Not ready yet.");
  }

  return {
    ready: issues.length === 0,
    tone: issues.length ? "error" : warnings.length ? "pending" : "success",
    lines,
    statusMessage: issues[0] || warnings[0] || "Ready to chat through 0G Compute.",
    provider: resolvedProvider,
    providerAccount,
  };
}

async function renderComputeInfo(result = null) {
  const config = getOgComputeConfig();
  const lines = [
    `Direct compute RPC: ${config.rpcUrl || "https://evmrpc.0g.ai"}`,
    `Configured model override: ${config.model || "provider default"}`,
  ];

  if (result?.model) {
    lines.push(`Last model used: ${result.model}`);
  }
  if (result?.usage) {
    lines.push(`Usage: prompt ${result.usage.prompt_tokens || 0}, completion ${result.usage.completion_tokens || 0}`);
  }
  if (result?.verification !== undefined) {
    lines.push(
      result.verification === null
        ? "TEE verification skipped."
        : result.verification
          ? "TEE verification passed."
          : "TEE verification failed.",
    );
  }
  if (result?.chatId) {
    lines.push(`Chat ID: ${result.chatId}`);
  }

  const readiness = state.latestReadiness;
  if (readiness?.providerAccount?.balance !== undefined) {
    lines.push(`Provider sub-account balance: ${readiness.providerAccount.balance}`);
  } else if (readiness?.provider?.providerAddress) {
    lines.push("Provider sub-account balance unavailable until the provider account can be inspected.");
  } else {
    lines.push("Connect wallet and refresh providers to inspect the selected provider balance.");
  }

  renderParagraphList(elements.mentorComputeOutput, lines);
}

async function refreshProviders() {
  saveMentorSettings();
  state.providerCatalog = await listOgComputeProviders();
  await renderMentorReadiness();
  renderComputeInfo();
  renderProviderInfo();
}

async function fundSelectedComputeProvider() {
  if (!state.signer || !state.walletAddress) {
    setMentorStatus("Connect MetaMask before funding 0G Compute.", "error");
    return;
  }

  await refreshTraderWalletState();
  if (!OG_MAINNET_CHAIN_IDS.has(state.walletChainId)) {
    setMentorStatus("Switching trader wallet to 0G Mainnet...", "pending");
    const switched = await switchTraderWalletToOgMainnet();
    if (!switched) {
      setMentorStatus("Switch to 0G Mainnet before funding 0G Compute.", "error");
      return;
    }
  }

  try {
    const provider = await resolveOgChatProvider({
      signer: state.signer,
      preferredProviderAddress: elements.ogComputeProviderAddressInput.value.trim() || undefined,
    });
    const amount = Number(elements.ogComputeFundAmountInput?.value || 3);
    setMentorStatus(`Funding 0G Compute provider ${shortenAddress(provider.providerAddress)}...`, "pending");
    await fundOgComputeProvider({
      signer: state.signer,
      providerAddress: provider.providerAddress,
      amount,
    });
    setMentorStatus(`Funded provider sub-account with ${amount} 0G.`, "success");
    await renderMentorReadiness();
  } catch (error) {
    console.error(error);
    setMentorStatus(normalizeError(error, "0G Compute funding failed."), "error");
  }
}

function renderProviderInfo(result = null) {
  const lines = [];
  const readiness = state.latestReadiness;

  if (result?.providerAddress) {
    lines.push(`Last provider used: ${result.providerAddress}`);
  } else if (readiness?.provider?.providerAddress) {
    lines.push(`Selected provider: ${readiness.provider.providerAddress}`);
  }

  if (result?.service?.healthMetrics?.status) {
    lines.push(`Provider health: ${result.service.healthMetrics.status}`);
  } else if (readiness?.provider?.service?.healthMetrics?.status) {
    lines.push(`Provider health: ${readiness.provider.service.healthMetrics.status}`);
  }

  if (readiness?.provider?.endpoint) {
    lines.push(`Resolved endpoint: ${readiness.provider.endpoint}`);
  }

  if (readiness?.provider?.model) {
    lines.push(`Resolved model: ${readiness.provider.model}`);
  }

  const preferredProvider = elements.ogComputeProviderAddressInput.value.trim();
  if (preferredProvider) {
    lines.push(`Preferred provider: ${preferredProvider}`);
  }

  if (state.providerCatalog.length) {
    const preview = state.providerCatalog.slice(0, 4);
    preview.forEach((service) => {
      const label = service.provider || "unknown";
      const health = service.healthMetrics?.status || "unknown";
      const model = service.model || "provider metadata required";
      lines.push(`${label} | ${health} | ${model}`);
    });
  } else {
    lines.push("No provider metadata loaded yet.");
  }

  renderParagraphList(elements.mentorProviderOutput, lines);
}

function renderIdentityPanel() {
  const readiness = state.latestReadiness;
  const lines = [];

  if (state.walletAddress) {
    lines.push(`Connected trader wallet: ${state.walletAddress}`);
    lines.push(
      `Wallet network: ${OG_MAINNET_CHAIN_IDS.has(state.walletChainId) ? "0G Mainnet" : "wrong network"}`,
    );
  } else {
    lines.push("Connected trader wallet: not connected yet.");
  }

  if (readiness?.provider?.providerAddress) {
    lines.push(`Selected compute provider: ${readiness.provider.providerAddress}`);
  } else {
    lines.push("Selected compute provider: not resolved yet.");
  }

  if (readiness?.providerAccount?.balance !== undefined) {
    lines.push(`Sub-account status: ready with balance ${readiness.providerAccount.balance}`);
  } else if (readiness?.lines?.some((line) => line.toLowerCase().includes("sub-account: missing"))) {
    lines.push("Sub-account status: missing for this wallet and provider.");
  } else if (state.signer && readiness?.provider?.providerAddress) {
    lines.push("Sub-account status: not confirmed yet.");
  } else {
    lines.push("Sub-account status: connect wallet and refresh providers.");
  }

  renderParagraphList(elements.mentorIdentityOutput, lines);
}

function usePromptChip(prompt) {
  elements.mentorPromptInput.value = prompt;
  elements.mentorPromptInput.focus();
}

function maybeOpenOnboarding() {
  const hasSeenOnboarding = window.localStorage.getItem(AI_MENTOR_ONBOARDING_KEY) === "true";
  if (!hasSeenOnboarding) {
    openMentorOnboarding();
  }
}

function openMentorOnboarding() {
  state.onboardingStep = 0;
  renderOnboardingStep();
  elements.mentorOnboardingModal.classList.remove("hidden");
}

function closeMentorOnboarding() {
  elements.mentorOnboardingModal.classList.add("hidden");
  window.localStorage.setItem(AI_MENTOR_ONBOARDING_KEY, "true");
}

function nextMentorOnboardingStep() {
  if (state.onboardingStep >= ONBOARDING_STEPS.length - 1) {
    closeMentorOnboarding();
    return;
  }

  state.onboardingStep += 1;
  renderOnboardingStep();
}

function prevMentorOnboardingStep() {
  state.onboardingStep = Math.max(0, state.onboardingStep - 1);
  renderOnboardingStep();
}

function renderOnboardingStep() {
  const step = ONBOARDING_STEPS[state.onboardingStep];
  if (!step) {
    return;
  }

  elements.mentorOnboardingTitle.textContent = step.title;
  elements.mentorOnboardingDescription.textContent = step.description;
  renderParagraphList(elements.mentorOnboardingPoints, step.points);
  elements.mentorOnboardingNextButton.textContent = state.onboardingStep >= ONBOARDING_STEPS.length - 1 ? "Start Using Mentor" : "Next";
}

function clearMentorChat() {
  state.messages = [];
  state.latestAnalysis = "";
  saveAiMentorState({ messages: [] });
  renderMessages();
  renderAnalysis();
  setMentorStatus("Mentor chat cleared.", "muted");
}

function bindComposerShortcuts() {
  elements.mentorPromptInput?.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      sendMentorPrompt();
    }
  });
}

function renderParagraphList(element, lines) {
  element.innerHTML = "";
  lines.forEach((line) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = line;
    element.appendChild(paragraph);
  });
}

function setMentorStatus(message, tone = "muted") {
  elements.mentorStatus.textContent = message;
  elements.mentorStatus.dataset.tone = tone;
}

function splitIntoParagraphs(text) {
  return String(text || "")
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function shortHash(value) {
  return value ? `${value.slice(0, 10)}...${value.slice(-6)}` : "pending";
}

function toMentorErrorMessage(error) {
  const message = normalizeError(error, "AI mentor request failed.");
  if (String(message).toLowerCase().includes("sub-account not found")) {
    return "The selected 0G provider has no compute sub-account for this wallet yet. Transfer funds to that provider sub-account first, then refresh providers and try again.";
  }

  return message;
}

function normalizeProviderBalance(value) {
  const numericValue = Number(value || 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function normalizeError(error, fallback) {
  return error?.shortMessage || error?.reason || error?.message || fallback;
}
