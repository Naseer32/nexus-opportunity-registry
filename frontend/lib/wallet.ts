"use client";
import { useCallback, useEffect, useState } from "react";

const BRADBURY_CHAIN_ID_HEX = "0x107d"; // 4221
const BRADBURY_PARAMS = {
  chainId: BRADBURY_CHAIN_ID_HEX,
  chainName: "GenLayer Testnet Bradbury",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: ["https://rpc-bradbury.genlayer.com"],
  blockExplorerUrls: ["https://explorer-bradbury.genlayer.com"],
};

const eth = () => (typeof window !== "undefined" ? (window as any).ethereum : undefined);

export function useAccount() {
  const [address, setAddress] = useState<string | null>(null);
  useEffect(() => {
    const e = eth();
    if (!e) return;
    e.request({ method: "eth_accounts" }).then((a: string[]) => setAddress(a[0] ?? null)).catch(() => {});
    const h = (a: string[]) => setAddress(a[0] ?? null);
    e.on?.("accountsChanged", h);
    return () => e.removeListener?.("accountsChanged", h);
  }, []);
  const connect = useCallback(async () => {
    const e = eth();
    if (!e) throw new Error("No wallet found. Open this page in the MetaMask browser.");
    const a = await e.request({ method: "eth_requestAccounts" });
    try {
      await e.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BRADBURY_CHAIN_ID_HEX }] });
    } catch {
      await e.request({ method: "wallet_addEthereumChain", params: [BRADBURY_PARAMS] });
    }
    setAddress(a[0] ?? null);
  }, []);
  const disconnect = useCallback(() => setAddress(null), []);
  return { address, connect, disconnect };
}
