const params = new URLSearchParams(window.location.search);
const discordId = params.get("discord_id");
const discordUsername = params.get("discord_username");
if (discordId) {
  document.getElementById("discord-info").textContent =
    `Logged in as Discord user "${discordUsername}" (ID: ${discordId}).`;
}

// Same legal text as the bot's build_tos_embeds() (Discord /create-tos and
// the self-serve OpenAccountModal) - reproduced in full, not paraphrased.
document.getElementById("tos-text").innerHTML = `
  <p><strong>Section 1.1: Scope of Agreement</strong><br>
  This General Terms of Service document (hereinafter referred to as the "Terms" or "ToS") governs the access to and use of all financial products, savings accounts, deposit accounts, transaction structures, asset holding facilities, and associated interactive platforms (collectively referred to as the "Services") provided by Poy Enterprises (hereinafter referred to as "the Bank," "Poy Enterprises," "we," "us," or "our").</p>

  <p><strong>Section 1.2: Binding Acceptance</strong><br>
  By registering an account with Poy Enterprises, initiating a Discord ticket, conducting any transaction, depositing capital, or otherwise utilizing any of the Bank's Services, you and any legal entity you represent in relations with the Bank (hereinafter referred to as the "User") acknowledge that you have read, understood, possess the full legal capacity to enter contracts, and agree to be unconditionally bound by these Terms in their entirety. These Terms constitute an ironclad, legally binding contract between the User and the Bank. If you do not agree to or cannot comply with these Terms, you are strictly prohibited from accessing or using our Services.</p>

  <p><strong>Section 1.3: Unauthorised Access Penalties</strong><br>
  Any unauthorized use or access to Poy Enterprises' infrastructure or Services by individuals who do not agree to these Terms, or who lack the capacity to enter into them, shall be deemed a breach of contract and trespass. Such individuals shall be held civilly liable to Poy Enterprises for a minimum of $5,000 in liquidated damages per instance of unauthorized access, alongside any additional punitive damages pursued in the Courts of Redmont.</p>

  <p><strong>Section 1.4: Modifications to Terms</strong><br>
  The Bank reserves the right to modify, amend, or replace these Terms at its sole discretion at any time. Notice of substantive changes will be broadcast through official Poy Enterprises communication channels (including but not limited to the Bank's Discord server). Continued use of the Services following any such modification constitutes the User's binding and unconditional acceptance of the revised Terms.</p>

  <p><strong>Section 2.1: The Offer</strong><br>
  The Bank extends a standing Offer to provide high-security wealth storage, transaction processing, and specialized accounts to the User, subject to the operational limits, verification procedures, and liability exclusions set forth in these Terms. This Offer is officially communicated via this document and the public availability of the Bank's Discord server and banking infrastructure.</p>

  <p><strong>Section 2.2: The Acceptance</strong><br>
  The User provides Acceptance of this Offer by performing any of the following affirmative actions: (1) Opening a bank account via the Poy Enterprises Discord server or website; (2) Formally signing agreement to these Terms via the secure signature interface; (3) Transferring funds or assets to any account associated with or managed by Poy Enterprises. This Acceptance is unequivocal and mirrors the terms of the Offer represented by this document.</p>

  <p><strong>Section 2.3: Consideration</strong><br>
  <strong>The Bank provides:</strong> Secure physical and digital wealth storage, professional transaction processing, administrative security measures, and access to the Poy Enterprises financial ecosystem.<br>
  <strong>The User provides:</strong> Personal user data, strict adherence to the regulations of this document, capital deposits, and transaction fees (where applicable).</p>

  <p><strong>Section 2.4: Legal Capacity</strong><br>
  The User warrants that they possess the full legal Capacity to enter into this binding contract. In accordance with server regulations and the Contracts Act, the User explicitly warrants that: (1) They possess a valid, legally issued DemocracyCraft Passport; (2) They have accrued a minimum of six (6) hours of total playtime on the DemocracyCraft server at the time of account registration. Any individual who fails to meet both requirements is deemed to lack the capacity to enter this contract and is strictly prohibited from utilizing Poy Enterprises' Services.</p>

  <p><strong>Section 2.5: Legal Intent</strong><br>
  Both parties demonstrate a clear, undeniable Intent to create legal relations. The User acknowledges that this agreement is a formal, binding contract, enforceable under the laws of the Commonwealth of Redmont, and not a casual or non-binding arrangement.</p>

  <p><strong>Section 3.1: Account Creation Protocol</strong><br>
  To establish a personal or business account with the Bank, the User must open a secure ticket within the Poy Enterprises Discord Server, or complete the self-serve onboarding flow on this website. Users may be asked a series of questions to determine their financial needs and verify server credentials.</p>

  <p><strong>Section 3.2: Account Ownership</strong><br>
  Upon successful verification and setup, the individual, business, or registered corporate entity that initiated the onboarding shall be declared the sole legal Owner of that account.</p>

  <p><strong>Section 4.1: Savings Accounts</strong><br>
  By transferring funds into a Poy Enterprises Savings Account, the User acknowledges and agrees to the following management framework: (1) <strong>Ownership of Capital:</strong> While the principal wealth belongs to the User, Poy Enterprises is granted explicit and unconditional permission to utilize the deposited funds for lawful, revenue-generating activities, specifically including the deployment of financing capital and loans to third parties. (2) <strong>Withdrawal Processing:</strong> The User may request to deposit or withdraw funds from their Savings Account at any time. However, to maintain institution liquidity, all withdrawals require the explicit confirmation, processing, and authorization of an official Poy Enterprises Banker.</p>

  <p><strong>Section 4.2: Deposit Accounts</strong><br>
  By transferring funds into a Poy Enterprises Deposit Account, the User acknowledges and agrees to the following framework: (1) <strong>Usage of Funds:</strong> Funds held within standard Deposit Accounts are kept fully in reserve and are not utilized for external corporate lending. (2) <strong>Withdrawal Processing:</strong> The User may deposit or withdraw funds at their discretion.</p>

  <p><strong>Section 5.1: Illegal Use</strong><br>
  The User is strictly prohibited from creating an account or utilizing Poy Enterprises' Services for any illegal or illicit purposes under the laws of the Commonwealth of Redmont, including money laundering, fraud, or tax evasion.</p>

  <p><strong>Section 5.2: System Exploitations & Unjust Enrichment</strong><br>
  (1) <strong>Exploit Prohibition:</strong> The User is strictly prohibited from exploiting, or assisting others in exploiting, any flaws, bugs, glitches, lag-induced transaction duplicates, or unintended functionalities within Poy Enterprises' systems, Discord bots, or ledger databases ("System Errors"). (2) <strong>Duty to Report:</strong> If the User discovers a System Error, they have an affirmative, immediate duty to report the vulnerability to Poy Enterprises management. (3) <strong>Unjust Enrichment:</strong> Any funds, balances, or assets acquired by a User resulting from a System Error, administrative error, glitch, or unintended behavior of our banking services are not the property of the User and are immediately due and payable back to the Bank. (4) <strong>Prosecution for Failure to Return:</strong> Transferring, spending, hiding, or concealing funds unjustly acquired via System Errors shall be treated as fraud and grand theft. Poy Enterprises reserves the right to pursue full civil litigation for the recovery of these funds, punitive damages, and all associated legal fees.</p>

  <p><strong>Section 5.3: Account Freezes and Termination</strong><br>
  Poy Enterprises reserves the right to temporarily freeze, permanently restrict, or terminate any account (including linked business or corporate accounts) if we have a valid reason to do so. Valid reasons include, but are not limited to: suspicion of fraud, violation of these Terms, or system safety concerns. This action may be executed with or without prior notice to the User.</p>

  <p><strong>Section 6.1 & 6.2: Data Privacy & Confidentiality Standards</strong><br>
  To facilitate security, Poy Enterprises collects and logs: Discord usernames/IDs, Minecraft IGNs, transaction logs, and balances. Poy Enterprises warrants that all collected personal and financial data will be kept highly confidential. The Bank will not disclose or publish User data to any third party, except: (1) Under explicit consent of the User, (2) As required to prove transaction history during a court proceeding, or (3) In compliance with a legally binding warrant, subpoena, or court order issued by the Courts of Redmont.</p>

  <p><strong>Section 7.1: Exclusion of Damage and Loss Liability</strong><br>
  The Bank, its owners (including Poy1), directors, and employees shall not be held liable for any damages, economic losses, opportunity costs, or missing balances arising from: (1) Unforeseen server events, game-wide asset adjustments, database wipes, or infrastructure failures. (2) Security breaches resulting from User negligence (such as compromised Discord accounts). (3) Temporary downtime, maintenance windows, or bot outages that delay transaction processing. If catastrophic loss of funds occurs due to external third-party actions, Poy Enterprises reserves the right to seek third-party legal action for full recovery on behalf of its clients.</p>

  <p><strong>Section 7.2: Indemnification Clause</strong><br>
  The User agrees to indemnify, defend, and hold harmless Poy Enterprises, its owners, and representatives from any claims, civil lawsuits, damages, losses, or legal expenses (including court fees) arising directly from the User's violation of these Terms or misuse of the Bank's Services.</p>

  <p><strong>Section 8.1, 8.2 & 8.3: General Legal Provisions</strong><br>
  <strong>Severability:</strong> If any specific provision is declared invalid or illegal by a ruling court of Redmont, that provision shall be limited or eliminated to the minimum extent. The rest remains fully active.<br>
  <strong>Governing Law:</strong> These Terms shall be governed by, construed, and enforced in accordance with the laws of the Commonwealth of Redmont. Disputes must first be negotiated in good faith.<br>
  <strong>Entire Agreement:</strong> These Terms constitute the entire, exclusive legal agreement between the User and Poy Enterprises regarding the use of our Services, completely superseding any prior understandings.</p>

  <p><strong>Article IX: Execution & Authorization</strong><br>
  By establishing an account or proceeding with any banking ticket within the Poy Enterprises system, both parties formally execute this contract and agree to be bound by its terms.<br><br>
  Authorized Representative for Poy Enterprises: <strong>Poy1</strong></p>
`;

function showError(message) {
  const el = document.getElementById("signup-error");
  el.textContent = message;
  el.style.display = "";
}

document.getElementById("open-account-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  const ign = document.getElementById("signup-ign").value.trim();
  const agree = document.getElementById("signup-agree").checked;

  btn.disabled = true;
  try {
    const res = await fetch("/api/account/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minecraft_ign: ign, agree }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      showError(body.error || "Something went wrong.");
      btn.disabled = false;
      return;
    }
    enterPendingState(ign, body.entry?.verification_amount);
  } catch {
    showError("Couldn't reach the server. Try again shortly.");
    btn.disabled = false;
  }
});

let statusPollTimer = null;

function enterPendingState(ign, amount) {
  document.getElementById("signup-section").style.display = "none";
  const pendingSection = document.getElementById("pending-section");
  pendingSection.style.display = "";
  document.getElementById("pending-ign").textContent = ign;
  document.getElementById("pending-ign-2").textContent = ign;
  document.getElementById("pending-amount").textContent = amount || "?";
  pollStatus();
  statusPollTimer = setInterval(pollStatus, 10000);
}

async function pollStatus() {
  try {
    const res = await fetch("/api/account/status");
    if (!res.ok) return;
    const data = await res.json();
    if (data.status === "linked") {
      clearInterval(statusPollTimer);
      document.getElementById("pending-status").textContent = "Verified! Redirecting...";
      setTimeout(() => (window.location.href = "/portal.html"), 1200);
    } else if (data.status === "pending") {
      document.getElementById("pending-status").textContent = "Waiting for payment...";
    }
  } catch {
    // Silent - just try again on the next interval tick.
  }
}

// If they already have a pending claim from an earlier visit (e.g. they
// closed the tab after submitting), pick up where they left off instead of
// showing the signup form again.
(async () => {
  try {
    const res = await fetch("/api/account/status");
    if (!res.ok) return;
    const data = await res.json();
    if (data.status === "linked") {
      window.location.href = "/portal.html";
    } else if (data.status === "pending") {
      enterPendingState(data.ign, data.verification_amount);
    }
  } catch {
    // Not logged in as "unlinked" role, or a transient error - leave the
    // signup form showing either way.
  }
})();
