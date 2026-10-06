# NEXUS Opportunity Oracle

An Evidence-Bound Opportunity Registry on GenLayer: an Intelligent Contract
that lets anyone submit a Web3 "opportunity" (grant, hackathon, incentive,
airdrop) together with a source URL and a GEN bond. GenLayer validators
independently fetch the source page themselves (`gl.nondet.web.get`) and
reach consensus on a verdict — the contract never trusts a claim without
checking it, and never promises returns.

**Live app:** https://nexus-opportunity-oracle.vercel.app/

## The problem

Most "opportunities" shared in Web3/crypto spaces are unverifiable or
outright scams. There is no neutral, on-chain way to check a claim against
its actual source before people spend time or money on it.

## How it works

Contract: `contracts/nexus_opportunity_oracle.py`

1. **`submit_opportunity(title, category, source_url)`** — payable. The
   caller stakes a GEN bond (minimum 0.01 GEN) alongside a claim and its
   source URL. Duplicate source URLs are rejected.
2. **`verify_opportunity(opportunity_id)`** — validators fetch the source
   page via `gl.nondet.web.get`, and reach consensus (`gl.eq_principle`) on:
   - `verdict`: `verified` / `unverified` / `scam_risk`
   - `reward_tier`: `none` / `low` / `medium` / `high`
   - `reason`: a short explanation grounded in the page content
3. **Consequence, not just a label:**
   - `verified` → full bond refunded to the submitter
   - `unverified` → 80% of the bond refunded, 20% to the contract treasury
   - `scam_risk` → bond forfeited entirely to the treasury
4. **`withdraw_treasury(to_address, amount)`** — owner-only (the deploying
   address). Lets forfeited/retained bonds be disbursed instead of staying
   permanently locked in the contract.
5. **Views:** `get_opportunity`, `get_opportunities`, `get_stats`
   (`count`, `treasury_wei`, `owner`).

The page text fetched from the source is treated as untrusted data in the
prompt — the model is explicitly told not to follow any instructions found
inside it, only to judge the claim against it.

## Frontend

Next.js app (`frontend/`) with MetaMask wallet connect that calls
`submit_opportunity`, `verify_opportunity`, and (for the owner)
`withdraw_treasury` directly, handling the full transaction lifecycle from
submission through validator consensus to result. Confirmed working
end-to-end through the live UI: a submitted grant listing was verified by
validators and displayed with its reward tier and reason.

## Deployments and on-chain evidence

### GenLayer Bradbury testnet (primary)
- Contract: `contracts/nexus_opportunity_oracle.py`
- Address: `0x853d76e2D396B00f482Ef1fE18305aB3aBbaE785`
- Scam case verified end to end: submit (1 GEN bond) → verify_opportunity
  sets `verdict: scam_risk`, `treasury_wei` becomes `1000000000000000000`
  → `withdraw_treasury(owner, 999999999999999999)` finalized →
  `treasury_wei` back to `0`.
- Verified case (via the live app): a real grant listing resolved
  `verdict: verified`, `reward_tier: medium`.

### GenLayer studionet (proof that real GEN settlement works)
- Address: `0x7a5C0D691B95bC2cbEEd2C238cFa30371c333C4e`
- Verified case: bond actually refunded to the submitter's wallet,
  confirmed on-chain (tx `0x2aab4bedf6673ae9a3380700e24a68427f96e3aaad0b85ec48b67cfa95633c04`).
- Scam case: bond actually forfeited to treasury, confirmed on-chain
  (tx `0x645b9c86bb1d4dcd5ccf2a307852d9fc4e182c8b8a2fd721b17244e1b8f1f558`).

## Known platform limitation (Bradbury / Asimov testnet)

On Bradbury testnet (chain id 4221, shared with Asimov), GenVM records an
emitted payout message (`emit_transfer`) in the transaction, but the
underlying GEN transfer is not currently executed on-chain. This is a
documented, platform-level issue, not specific to this contract:
https://github.com/genlayerlabs/genvm-manager/issues/20

We reproduced this independently on both the `verified` refund path and the
`withdraw_treasury` path: contract state updates correctly every time, but
wallet GEN balance does not change on Bradbury. The same payout code path
was verified to move real GEN end-to-end on studionet (see above).

## Test evidence
- `evidence/sample_grant.txt` — a realistic grant announcement (verified case)
- `evidence/sample_scam.txt` — a page asking for a seed phrase and an
  upfront fee with a guaranteed-return promise (scam case)

## Design note
This contract does not predict prices, execute trades, or promise any
return. It only checks whether a claim about an opportunity is backed by
its stated source, and makes that check consequential through a bond.
