const DEFAULT_EXPERT_BASE_URL = "https://stellar.expert/explorer/testnet";

export const getStellarExpertBaseUrl = () =>
  (import.meta.env.VITE_STELLAR_EXPERT_BASE_URL || DEFAULT_EXPERT_BASE_URL).replace(/\/$/, "");

export const transactionUrl = (txHash: string) => `${getStellarExpertBaseUrl()}/tx/${txHash}`;

export const contractUrl = (contractId: string) => `${getStellarExpertBaseUrl()}/contract/${contractId}`;

export const accountUrl = (accountId: string) => `${getStellarExpertBaseUrl()}/account/${accountId}`;
