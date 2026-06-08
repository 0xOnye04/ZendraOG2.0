const DEFAULT_OG_COMPUTE_RPC_URL = "https://evmrpc.0g.ai";
const OG_MAINNET_CHAIN_ID = 16661;
const DEFAULT_OG_COMPUTE_MODEL = "";
const DEFAULT_PROVIDER_ADDRESS = "";

type ChatMessage = { role: string; content: string };

let cachedSdkModule: any = null;
let cachedReadOnlyBroker: any = null;

function readRuntimeConfig(key: string, fallbackValue = "") {
  if (key === "ogComputeRpcUrl") {
    window.localStorage.removeItem("zendra_ogComputeRpcUrl");
    return DEFAULT_OG_COMPUTE_RPC_URL;
  }

  const runtime = (window as any).ZENDRA_CONFIG || {};
  const envKey = `VITE_${String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toUpperCase()}`;
  const envValue = (import.meta as any).env?.[envKey];
  const localValue = window.localStorage.getItem(`zendra_${key}`) || "";
  return runtime[key] || envValue || localValue || fallbackValue;
}

export function getOgComputeConfig() {
  return {
    rpcUrl: readRuntimeConfig("ogComputeRpcUrl", DEFAULT_OG_COMPUTE_RPC_URL),
    model: readRuntimeConfig("ogComputeModel", DEFAULT_OG_COMPUTE_MODEL),
    providerAddress: readRuntimeConfig("ogComputeProviderAddress", DEFAULT_PROVIDER_ADDRESS),
  };
}

export function saveOgComputeConfig({
  rpcUrl,
  model,
  providerAddress,
}: {
  rpcUrl?: string;
  model?: string;
  providerAddress?: string;
}) {
  persistConfigValue("ogComputeRpcUrl", DEFAULT_OG_COMPUTE_RPC_URL);
  persistConfigValue("ogComputeModel", model || DEFAULT_OG_COMPUTE_MODEL);
  persistConfigValue("ogComputeProviderAddress", providerAddress || DEFAULT_PROVIDER_ADDRESS);
}

function persistConfigValue(key: string, value?: string) {
  const normalized = String(value || "").trim();
  if (normalized) {
    window.localStorage.setItem(`zendra_${key}`, normalized);
    return;
  }

  window.localStorage.removeItem(`zendra_${key}`);
}

async function loadComputeSdk() {
  if (cachedSdkModule) {
    return cachedSdkModule;
  }

  cachedSdkModule = await import("@0gfoundation/0g-compute-ts-sdk");
  return cachedSdkModule;
}

async function getReadOnlyBroker() {
  const config = getOgComputeConfig();
  if (cachedReadOnlyBroker && cachedReadOnlyBroker.__rpcUrl === config.rpcUrl) {
    return cachedReadOnlyBroker;
  }

  const sdk = await loadComputeSdk();
  const broker = await sdk.createZGComputeNetworkReadOnlyBroker(config.rpcUrl);
  broker.__rpcUrl = config.rpcUrl;
  cachedReadOnlyBroker = broker;
  return broker;
}

export async function createOgComputeBroker(signer: any) {
  if (!signer) {
    throw new Error("Connect a trader wallet before using 0G Compute Direct mode.");
  }

  const network = await signer.provider?.getNetwork?.();
  if (Number(network?.chainId || 0) !== OG_MAINNET_CHAIN_ID) {
    throw new Error("Switch your wallet to 0G Mainnet before using 0G Compute.");
  }

  const sdk = await loadComputeSdk();
  return sdk.createZGComputeNetworkBroker(signer);
}

export async function listOgComputeProviders() {
  const broker = await getReadOnlyBroker();
  let services;

  try {
    services = await broker.inference.listServiceWithDetail(0, 50, false);
  } catch {
    services = await broker.inference.listService(0, 50, false);
  }

  return services
    .map(normalizeComputeService)
    .filter((service: any) => String(service?.serviceType || "").toLowerCase() === "chatbot");
}

export async function resolveOgChatProvider({
  signer,
  preferredProviderAddress,
}: {
  signer?: any;
  preferredProviderAddress?: string;
}) {
  const preferred = String(preferredProviderAddress || getOgComputeConfig().providerAddress || "").toLowerCase();
  let services: any[] = [];

  try {
    services = await listOgComputeProviders();
  } catch (error) {
    if (isAddress(preferred)) {
      return resolveOgChatProviderByAddress({ signer, providerAddress: preferred });
    }

    throw new Error(
      "Unable to load 0G Compute provider list. Enter a Preferred Provider address, then refresh or send again.",
    );
  }

  if (!services.length && isAddress(preferred)) {
    return resolveOgChatProviderByAddress({ signer, providerAddress: preferred });
  }

  if (!services.length) {
    throw new Error("No 0G chatbot providers are currently available.");
  }

  let selected = preferred
    ? services.find((service: any) => String(service.provider || "").toLowerCase() === preferred)
    : null;

  if (!selected && isAddress(preferred)) {
    return resolveOgChatProviderByAddress({ signer, providerAddress: preferred });
  }

  if (!selected) {
    selected = services.find((service: any) => service.healthMetrics?.status === "healthy") || services[0];
  }

  const providerAddress = selected.provider;
  const metadataBroker = signer ? await createOgComputeBroker(signer) : await getReadOnlyBroker();
  const { endpoint, model } = await metadataBroker.inference.getServiceMetadata(providerAddress);

  return {
    providerAddress,
    endpoint,
    model,
    service: selected,
  };
}

async function resolveOgChatProviderByAddress({
  signer,
  providerAddress,
}: {
  signer?: any;
  providerAddress: string;
}) {
  const metadataBroker = signer ? await createOgComputeBroker(signer) : await getReadOnlyBroker();
  const { endpoint, model } = await metadataBroker.inference.getServiceMetadata(providerAddress);

  return {
    providerAddress,
    endpoint,
    model,
    service: {
      provider: providerAddress,
      serviceType: "chatbot",
      healthMetrics: null,
    },
  };
}

function normalizeComputeService(service: any) {
  return {
    provider: service?.provider,
    serviceType: service?.serviceType,
    url: service?.url,
    inputPrice: service?.inputPrice,
    outputPrice: service?.outputPrice,
    updatedAt: service?.updatedAt,
    model: service?.model,
    verifiability: service?.verifiability,
    additionalInfo: service?.additionalInfo,
    teeSignerAddress: service?.teeSignerAddress,
    teeSignerAcknowledged: service?.teeSignerAcknowledged,
    healthMetrics: service?.healthMetrics,
    modelInfo: service?.modelInfo,
  };
}

function isAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || ""));
}

export async function runOgDirectChatCompletion({
  signer,
  messages,
  preferredProviderAddress,
  preferredModel,
  verifyResponse = true,
  signal,
}: {
  signer: any;
  messages: ChatMessage[];
  preferredProviderAddress?: string;
  preferredModel?: string;
  verifyResponse?: boolean;
  signal?: AbortSignal;
}) {
  let broker = await createOgComputeBroker(signer);
  let provider = await resolveOgChatProvider({
    signer,
    preferredProviderAddress,
  });

  const configuredModel = preferredModel || getOgComputeConfig().model || "";
  let finalModel = chooseOgModel(configuredModel, provider.model || "");
  const contentForBilling = JSON.stringify(messages);

  let headers = await broker.inference.getRequestHeaders(provider.providerAddress, contentForBilling);
  let response = await sendProviderChatRequest({
    endpoint: provider.endpoint,
    model: finalModel,
    messages,
    headers,
    signal,
  });

  if (!response.ok) {
    const errorText = await readResponseText(response);
    if (isExpiredSessionError(response, errorText)) {
      broker = await createOgComputeBroker(signer);
      headers = await broker.inference.getRequestHeaders(provider.providerAddress, contentForBilling);
      response = await sendProviderChatRequest({
        endpoint: provider.endpoint,
        model: finalModel,
        messages,
        headers,
        signal,
      });

      if (!response.ok) {
        const refreshedErrorText = await readResponseText(response);
        if (isExpiredSessionError(response, refreshedErrorText)) {
          provider = await resolveAlternativeOgChatProvider({
            signer,
            excludedProviderAddresses: [provider.providerAddress],
          });
          finalModel = chooseOgModel(configuredModel, provider.model || "");
          broker = await createOgComputeBroker(signer);
          headers = await broker.inference.getRequestHeaders(provider.providerAddress, contentForBilling);
          response = await sendProviderChatRequest({
            endpoint: provider.endpoint,
            model: finalModel,
            messages,
            headers,
            signal,
          });

          if (!response.ok) {
            const fallbackErrorText = await readResponseText(response);
            throw buildProviderErrorFromText(response, fallbackErrorText, "0G provider chat request failed after trying another provider");
          }
        } else {
          throw buildProviderErrorFromText(response, refreshedErrorText, "0G provider chat request failed after refreshing the 0G session");
        }
      }
    } else {
      throw buildProviderErrorFromText(response, errorText, "0G provider chat request failed");
    }
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content || "";
  const chatId = response.headers.get("ZG-Res-Key")
    || response.headers.get("zg-res-key")
    || payload?.id
    || payload?.chatID;

  let verification = null;
  if (verifyResponse && chatId) {
    verification = await broker.inference.processResponse(provider.providerAddress, chatId, JSON.stringify(payload?.usage || {}));
  }

  return {
    text,
    raw: payload,
    usage: payload?.usage || null,
    model: payload?.model || finalModel,
    endpoint: provider.endpoint,
    providerAddress: provider.providerAddress,
    service: provider.service,
    headers,
    chatId,
    verification,
  };
}

function chooseOgModel(configuredModel: string, supportedModel: string) {
  return configuredModel && configuredModel === supportedModel
    ? configuredModel
    : supportedModel || configuredModel;
}

async function resolveAlternativeOgChatProvider({
  signer,
  excludedProviderAddresses,
}: {
  signer: any;
  excludedProviderAddresses: string[];
}) {
  const excluded = new Set((excludedProviderAddresses || []).map((address) => String(address || "").toLowerCase()));
  const services = (await listOgComputeProviders())
    .filter((service: any) => !excluded.has(String(service.provider || "").toLowerCase()));

  if (!services.length) {
    throw new Error("The selected 0G provider session expired and no alternative chatbot provider is currently available. Clear Preferred Provider, refresh providers, and try again.");
  }

  const selected = services.find((service: any) => service.healthMetrics?.status === "healthy") || services[0];
  const providerAddress = selected.provider;
  const metadataBroker = await createOgComputeBroker(signer);
  const { endpoint, model } = await metadataBroker.inference.getServiceMetadata(providerAddress);

  return {
    providerAddress,
    endpoint,
    model,
    service: selected,
  };
}

async function sendProviderChatRequest({
  endpoint,
  model,
  messages,
  headers,
  signal,
}: {
  endpoint: string;
  model: string;
  messages: ChatMessage[];
  headers: Record<string, string>;
  signal?: AbortSignal;
}) {
  return fetch(`${String(endpoint).replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
      model,
      messages,
    }),
  });
}

function isExpiredSessionError(response: Response, text: string) {
  return response.status === 400 && /session token expired/i.test(text || "");
}

export async function fundOgComputeProvider({
  signer,
  providerAddress,
  amount = 3,
}: {
  signer: any;
  providerAddress: string;
  amount?: number;
}) {
  if (!signer) {
    throw new Error("Connect a trader wallet before funding 0G Compute.");
  }

  if (!providerAddress) {
    throw new Error("Select or enter a 0G Compute provider before funding.");
  }

  const broker = await createOgComputeBroker(signer);
  const normalizedAmount = Number(amount || 0);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error("Enter a valid 0G amount to fund the provider.");
  }

  if (normalizedAmount < 3) {
    throw new Error("New 0G Compute ledgers require at least 3 0G. Use 3 or more.");
  }

  await broker.ledger.depositFund(normalizedAmount);
  await broker.ledger.transferFund(providerAddress, "inference", toNeuron(normalizedAmount));

  return {
    providerAddress,
    amount: normalizedAmount,
  };
}

function toNeuron(amount: number) {
  const [wholePart, fractionPart = ""] = String(amount).split(".");
  const paddedFraction = `${fractionPart}000000000000000000`.slice(0, 18);
  return BigInt(wholePart || "0") * 10n ** 18n + BigInt(paddedFraction || "0");
}

async function buildProviderError(response: Response, fallbackMessage: string) {
  const details = await readResponseText(response);
  return buildProviderErrorFromText(response, details, fallbackMessage);
}

async function readResponseText(response: Response) {
  try {
    return (await response.text()).trim();
  } catch {
    return "";
  }
}

function buildProviderErrorFromText(response: Response, details: string, fallbackMessage: string) {
  return new Error(details ? `${fallbackMessage} (${response.status}): ${details.slice(0, 220)}` : `${fallbackMessage} (${response.status}).`);
}
