"use client";
import { useCallback, useEffect, useState } from "react";
import { parseEther } from "viem";
import { CONTRACT, MIN_BOND, Opp, getOpps, getStats, send } from "@/lib/nexus";
import { useAccount } from "@/lib/wallet";

const CATS = ["Grants", "Hackathon", "DeFi incentive", "Attention economy", "Airdrop", "Other"];
const BADGE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300", verified: "bg-emerald-500/15 text-emerald-300",
  unverified: "bg-zinc-500/20 text-zinc-300", flagged: "bg-red-500/15 text-red-300",
};
const short = (a: string) => (a ? a.slice(0, 6) + "..." + a.slice(-4) : "");
const gen = (wei: string) => String(Number(wei) / 1e18);
const input = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-emerald-400";

export default function Home() {
  const { address, connect, disconnect } = useAccount();
  const [opps, setOpps] = useState<Opp[]>([]);
  const [stats, setStats] = useState({ count: 0, treasury_wei: "0", owner: "" });
  const [cat, setCat] = useState("All");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [err, setErr] = useState("");
  const [f, setF] = useState({ title: "", category: CATS[0], url: "", bond: "0.02" });
  const [wAmount, setWAmount] = useState("");
  const [wTo, setWTo] = useState("");

  const load = useCallback(async () => {
    try { const [o, s] = await Promise.all([getOpps(), getStats()]); setOpps(o); setStats(s); } catch {}
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  const isOwner = !!address && !!stats.owner && address.toLowerCase() === stats.owner.toLowerCase();

  async function act(fn: () => Promise<void>) {
    setErr(""); setBusy(true);
    try { await fn(); setStage("Done."); await load(); }
    catch (e: any) { setErr(String(e?.shortMessage || e?.message || e).slice(0, 300)); setStage(""); }
    finally { setBusy(false); }
  }

  const valid = f.title.trim() && f.url.trim().startsWith("http") && Number(f.bond) >= MIN_BOND;
  const submit = () => act(async () => {
    await send(address!, "submit_opportunity", [f.title.trim(), f.category, f.url.trim()], parseEther(f.bond), setStage);
    setF({ ...f, title: "", url: "" });
  });
  const verify = (id: string) => act(async () => { await send(address!, "verify_opportunity", [id], BigInt(0), setStage); });
  const withdraw = () => act(async () => {
    if (!wTo.trim() || !wAmount.trim()) throw new Error("Enter a recipient address and amount in wei.");
    await send(address!, "withdraw_treasury", [wTo.trim(), wAmount.trim()], BigInt(0), setStage);
    setWAmount("");
  });

  const list = cat === "All" ? [...opps].reverse() : [...opps].reverse().filter((o) => o.category === cat);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <header className="flex items-center justify-between">
        <div className="text-2xl font-black tracking-widest text-emerald-400">NEXUS</div>
        {address ? (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-xs">{short(address)}</span>
            <button onClick={disconnect} className="rounded-full bg-white/10 px-3 py-1 text-xs text-red-300 hover:bg-white/20">Disconnect</button>
          </div>
        ) : (
          <button onClick={() => connect().catch((e) => setErr(e.message))} className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-bold text-black">Connect wallet</button>
        )}
      </header>

      <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">
        Known platform limitation on GenLayer Bradbury testnet: payout messages (bond refunds, treasury withdrawals) are recorded and the contract's own accounting updates correctly, but the underlying GEN transfer is not currently executed on-chain by the network (<a className="underline" href="https://github.com/genlayerlabs/genvm-manager/issues/20" target="_blank" rel="noopener noreferrer">genvm-manager#20</a>). Verdicts and state here are real; wallet balances will not change yet.
      </div>

      <h1 className="mt-6 text-3xl font-bold">Web3 opportunities, verified by validators</h1>
      <p className="mt-2 text-sm text-zinc-400">Anyone can submit an opportunity with a source URL and a GEN bond. GenLayer validators fetch the page themselves and agree on a verdict. Nothing here promises returns.</p>

      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        {[["Submitted", stats.count], ["Verified", opps.filter((o) => o.status === "verified").length], ["Treasury (GEN)", gen(stats.treasury_wei)]].map(([k, v]) => (
          <div key={String(k)} className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="text-xl font-bold">{String(v)}</div><div className="text-xs text-zinc-400">{k}</div></div>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="mb-3 font-bold">Submit an opportunity</h2>
        <div className="space-y-2">
          <input className={input} placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <select className={input} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATS.map((c) => <option key={c} className="bg-black">{c}</option>)}</select>
          <input className={input} placeholder="Source URL (https://...)" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
          <input className={input} placeholder="Bond in GEN (min 0.01)" inputMode="decimal" value={f.bond} onChange={(e) => setF({ ...f, bond: e.target.value.replace(/[^0-9.]/g, "") })} />
          <button disabled={!address || !valid || busy} onClick={submit} className="w-full rounded-lg bg-emerald-400 py-2 font-bold text-black disabled:opacity-40">{address ? (busy ? "Working..." : "Submit with bond") : "Connect wallet first"}</button>
        </div>
        {stage && <p className="mt-2 text-xs text-emerald-300">{stage}</p>}
        {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
      </section>

      {isOwner && (
        <section className="mt-4 rounded-2xl border border-sky-400/30 bg-sky-400/5 p-4">
          <h2 className="mb-2 font-bold text-sky-300">Owner: withdraw treasury</h2>
          <div className="space-y-2">
            <input className={input} placeholder="Recipient address (0x...)" value={wTo} onChange={(e) => setWTo(e.target.value)} />
            <input className={input} placeholder={`Amount in wei (treasury has ${stats.treasury_wei})`} value={wAmount} onChange={(e) => setWAmount(e.target.value.replace(/[^0-9]/g, ""))} />
            <button disabled={busy} onClick={withdraw} className="w-full rounded-lg bg-sky-400 py-2 font-bold text-black disabled:opacity-40">Withdraw</button>
          </div>
        </section>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {["All", ...CATS].map((c) => <button key={c} onClick={() => setCat(c)} className={"rounded-full px-3 py-1 text-xs " + (cat === c ? "bg-emerald-400 text-black" : "bg-white/10")}>{c}</button>)}
      </div>

      <div className="mt-4 space-y-3">
        {list.length === 0 && <p className="text-sm text-zinc-500">No opportunities yet.</p>}
        {list.map((o) => (
          <article key={o.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-2">
              <div><div className="font-bold">{o.title}</div><div className="text-xs text-zinc-400">{o.category} - {o.id} - bond {gen(o.bond)} GEN - by {short(o.submitter)}</div></div>
              <span className={"rounded-full px-2 py-1 text-xs " + (BADGE[o.status] || "bg-white/10")}>{o.status}</span>
            </div>
            {o.reason && <p className="mt-2 text-sm text-zinc-300">{o.reason}</p>}
            <div className="mt-3 flex items-center gap-2">
              <a href={o.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-400 underline">Source</a>
              {o.status === "pending" && <button disabled={!address || busy} onClick={() => verify(o.id)} className="rounded-lg bg-white/10 px-3 py-1 text-xs disabled:opacity-40">Verify with validators</button>}
            </div>
          </article>
        ))}
      </div>
      <footer className="mt-8 text-center text-xs text-zinc-500">
        Contract <a className="underline" href={"https://explorer-bradbury.genlayer.com/address/" + CONTRACT} target="_blank" rel="noopener noreferrer">{short(CONTRACT)}</a> on GenLayer Bradbury testnet - <a className="underline" href="https://github.com/Naseer32/genlayer-nexus-oracle" target="_blank" rel="noopener noreferrer">GitHub</a>
      </footer>
    </main>
  );
}
