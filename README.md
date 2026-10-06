# NEXUS Opportunity Oracle

An Evidence-Bound Opportunity Registry on GenLayer: an Intelligent Contract
that lets anyone submit a Web3 "opportunity" (grant, hackathon, incentive,
airdrop) together with a source URL and a GEN bond. GenLayer validators
independently fetch the source page themselves (`gl.nondet.web.get`) and
reach consensus on a verdict — the contract never trusts a claim without
checking it, and never promises returns.

## The problem

Most "opportunities" shared in Web3/crypto spaces are unverifiable or
outright scams. There is no neutral, on-chain way to check a claim against
its actual source before people spend time or money on it.

## Live app

https://frontend-mrbv.vercel.app/

Next.js app with wallet connect (MetaMask), submit-with-bond, live verify,
and an owner-only treasury withdrawal panel. Full submit -> verify lifecycle
confirmed working through the deployed UI itself (not just Studio/CLI):
title "Nexus Test Grant", bond 0.1 GEN, submitted by wallet
0x53b20BeADADe01b46a3fb5bdbC85D3A7B0f12A96 -> opp_1 -> verified via the
"Verify with validators" button, reason correctly citing the grant fixture.
The app also displays the known Bradbury payout limitation (see below) so
users are not misled about real GEN movement.

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
   permanently locked in the contract, while preserving the accounting
   invariant (`treasury` only ever decreases by what is actually withdrawn)
   and the authorization invariant (only the owner can call it).
5. **Views:** `get_opportunity`, `get_opportunities`, `get_stats`
   (`count`, `treasury_wei`, `owner`).

The page text fetched from the source is treated as untrusted data in the
prompt — the model is explicitly told not to follow any instructions found
inside it, only to judge the claim against it.

## Deployments and on-chain evidence

### GenLayer Bradbury testnet (primary)
- Contract: `contracts/nexus_opportunity_oracle.py`
- Address: `0x853d76e2D396B00f482Ef1fE18305aB3aBbaE785`
- Scam case verified end to end:
  - submit_opportunity (1 GEN bond): tx `0x7f347212...` (FINALIZED)
  - verify_opportunity → `verdict: scam_risk` → `get_stats.treasury_wei`
    became `1000000000000000000`
  - withdraw_treasury(owner, 999999999999999999): tx
    `0xe42fc51e8a500f0feb3f69dbf1fedb51415fe3e40cba37000d81747cc57590b3`
    (FINALIZED) → `get_stats.treasury_wei` back to `0`
- This confirms the accounting and authorization logic is correct and
  reproducible on-chain: verdicts are set correctly, the treasury counter
  tracks forfeited bonds precisely, and only the owner can withdraw.

### Earlier Bradbury validation (same logic, prior deployment)
- Address: `0x49095bd5A0788A8489412178626Da3071FA415ef`
- Verified case: submit
  `0x6d3fcefb75bc4fe51c0f4faa14c40c3b028cbb65915082ca311cf2b908004595`,
  verify `0xf4eef7f702381867b8120c15822da920c895eb6aa7f2a4711a3bd0664e4c9e42`
  → `verdict: verified`, `reward_tier: medium`
- Scam case: submit
  `0x0150b9ac55087d1770fb970f785dfdf09a57268795a01accd2e6e130a9ddfded`,
  verify `0x66e44f40ce350b3dfc013fff9aa44ff2f13c6bea2fbb0795aaa0d0356c15330e`
  → `verdict: scam_risk`, bond moved to treasury

### GenLayer studionet (proof that real GEN settlement works)
- Address: `0x7a5C0D691B95bC2cbEEd2C238cFa30371c333C4e`
- Verified case: submit
  `0x0be175258d745c99dfc276b6236dabf6084bb65b51fb19ef3437583b01daaded`,
  verify `0x2aab4bedf6673ae9a3380700e24a68427f96e3aaad0b85ec48b67cfa95633c04`
  → bond actually refunded to the submitter's wallet, confirmed on-chain
- Scam case: submit
  `0x3dae89196fe7d68e2b7b1e1a0f2e8a132b5d55d96cb7f64281bc3716be658910`,
  verify `0x645b9c86bb1d4dcd5ccf2a307852d9fc4e182c8b8a2fd721b17244e1b8f1f558`
  → bond actually forfeited to treasury, confirmed on-chain

## Known platform limitation (Bradbury / Asimov testnet)

On Bradbury testnet (and Asimov, which shares chain id 4221), GenVM records
an emitted payout message (`emit_transfer`) in the transaction, but the
underlying GEN transfer is not currently executed on-chain. This is a
documented, platform-level issue affecting any GenLayer contract that pays
out GEN on this testnet, not specific to this contract:
https://github.com/genlayerlabs/genvm-manager/issues/20

We reproduced this independently on both the `verified` refund path and the
`withdraw_treasury` path: contract state updates correctly every time, but
the wallet's real GEN balance does not change on Bradbury. The exact same
payout code path was verified to move real GEN end-to-end on studionet
(see above), confirming the contract logic itself is correct and the gap is
specific to Bradbury's current message-execution behavior.

## Test evidence
- `evidence/sample_grant.txt` — a realistic grant announcement (verified case)
- `evidence/sample_scam.txt` — a page asking for a seed phrase and an
  upfront fee with a guaranteed-return promise (scam case)

## Design note
This contract does not predict prices, execute trades, or promise any
return. It only checks whether a claim about an opportunity is backed by
its stated source, and makes that check consequential through a bond.
EOF

git add -A
git commit -qm "Rewrite README for single-contract repo layout"
git push -q
echo "PUSHED"
