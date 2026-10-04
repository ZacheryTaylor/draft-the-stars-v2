import { COMPANY as C, type LegalSlug } from "./company";

/**
 * Final legal documents for Draft the Stars, in a small Markdown subset (see markdown.tsx):
 * ## / ### headings (optional {#anchor}), paragraphs, "- " and "1. " lists, | tables |, **bold**, [links](/path).
 * Internal links use site paths (/terms, /privacy#cookies); the renderer adds the demo base path.
 * The same text is exported to Google Docs by scripts/export-legal.ts, so edit it here only.
 */
export interface LegalDoc {
  slug: LegalSlug;
  /** Page heading and Drive doc name: "Draft the Stars – <docName> (Effective Oct 4, 2026)". */
  docName: string;
  navLabel: string;
  summary: string;
  body: string;
}

const EMAIL = `[${C.supportEmail}](mailto:${C.supportEmail})`;
const MAIL = `${C.legalName}, ${C.address}`;

const terms: LegalDoc = {
  slug: "terms",
  docName: "Terms of Service",
  navLabel: "Terms",
  summary: `The rules for using ${C.product}, including the Acceptable Use rules, the $5 platform fee, and how disputes are handled.`,
  body: `
These Terms of Service ("Terms") are an agreement between you and ${C.legalName}, ${C.entity} ("${C.legalName}," "we," "us," or "our"). We operate ${C.product} at ${C.domain} and any related apps and services (together, the "Service").

By creating an account or using the Service, you agree to these Terms and to our [Privacy Policy](/privacy). Our [Refund & Cancellation Policy](/refunds) and [Platform Fee & No-Prize Disclosure](/fees-disclosure) are part of these Terms. If you do not agree, do not use the Service.

## 1. What Draft the Stars is {#what-it-is}

${C.product} is a fan-made fantasy draft and league site for reality competition shows, starting with Dancing with the Stars. You can create a free account, create or join a league, draft cast members, and follow weekly scores based on how the show plays out.

Accounts are free and creating a league is free. Each league member pays a one-time $5 platform fee for each league they join (see Section 5).

## 2. Who can use the Service {#eligibility}

- You must be at least **13 years old** to create an account or use the Service.
- If you are **13 to 17**, you may use the Service only with the consent of a parent or legal guardian, who must review and agree to these Terms for you. A parent or guardian must make or approve any payment.
- You may not use the Service if we have previously suspended or banned you, or if the law where you live does not allow it.
- The Service is offered from the United States and is intended for users in the United States.

## 3. Your account {#account}

- Give us accurate information and keep your email address current.
- Keep your password private. You are responsible for activity on your account. Tell us right away at ${EMAIL} if you think someone else has used it.
- One person per account. Do not sell, transfer, or share your account.
- Your username is public to other users. Do not use your real full name if you do not want it shown.

## 4. Leagues and commissioners {#leagues}

- A league has **3 to 12 members**. The person who creates a league is its **commissioner**.
- The commissioner chooses league settings, invites members, sets the draft order, can remove members before the draft, and can correct scores for their league.
- Commissioners are users, not our employees or agents. We are not responsible for how a commissioner runs a league, but we may step in if a league breaks these Terms.
- Scores are based on publicly available show results. We work to keep them accurate, but errors and delays can happen, and we or the commissioner may correct scores at any time.

## 5. The $5 platform fee {#platform-fee}

- Each member pays a **one-time $5 (USD) platform fee per league**. It is charged once per league spot, not monthly.
- The commissioner can pay the fee for some or all members, including open spots.
- **The draft cannot start until every spot in the league is filled and paid.**
- Fees pay for running the platform only: hosting, the database, email, score updates, support, development, and payment processing.
- **No prizes, payouts, or prize pools are paid from fees, and the Service is not gambling.** See the [Platform Fee & No-Prize Disclosure](/fees-disclosure).
- Payments are processed by Stripe. Stripe's terms and privacy policy also apply to your payment. We never see or store your full card number.
- If any sales tax applies, it will be shown at checkout before you pay.

## 6. No prizes, no gambling, and money between members {#no-prizes}

We do not award prizes, cash, gift cards, or anything else of value to anyone for how they finish in a league. Winning a league earns bragging rights only.

Any money that league members choose to collect, owe, or pay each other happens **off-platform** and is **not our responsibility**. We do not hold, track, collect, distribute, or enforce it, and we will not settle disputes about it. You are responsible for following the laws that apply to you.

## 7. Refunds {#refunds}

If a member leaves or a league is cancelled **before the draft starts**, the fee for that spot is refunded in full to whoever paid it. **No refunds after the draft starts, except where the law requires.** Full details are in the [Refund & Cancellation Policy](/refunds).

## 8. Your content {#your-content}

"Your content" means anything you add to the Service, such as your username, display name, league names, team names, and any messages or notes.

- You keep ownership of your content.
- You give us a non-exclusive, worldwide, royalty-free license to host, store, copy, display, and adapt your content only as needed to run, improve, and promote the Service (for example, showing your team name in league standings). This license ends when your content is deleted, except for copies kept in backups for a limited time or as required by law.
- **You are responsible for your content.** It must follow the Acceptable Use rules below, and you must have the right to post it.
- We do not review all content before it appears, but we may review, edit, hide, or remove any content at any time.

## 9. Acceptable Use {#acceptable-use}

When you use the Service, you agree not to:

- Choose a username, league name, team name, or other content that is hateful, harassing, threatening, sexually explicit, violent, or discriminatory, or that targets a real person (including cast members) with abuse.
- Impersonate any person, show, network, or company, or suggest that ${C.product} or your league is official or endorsed by a show.
- Harass, bully, threaten, or dox other users, or share anyone's private information.
- Use the Service to run, advertise, or organize gambling, betting, or paid contests with prizes, or to collect money for any purpose that is illegal where you or other members live.
- Post spam, ads, links to malware, or phishing.
- Post content that infringes someone else's copyright, trademark, or other rights, including show logos, photos, or video clips.
- Create accounts with false information, create multiple accounts to get around limits or bans, or let a child under 13 use the Service.
- Commit payment fraud, use stolen payment methods, or file false chargebacks.
- Scrape, crawl, or copy the Service or its data with bots or automated tools, except public search engines following our robots rules.
- Probe, attack, overload, or interfere with the Service, or try to access accounts, leagues, or data you are not allowed to access.
- Copy, reverse engineer, or resell the Service, except where the law allows it.
- Break any law or help anyone else break these rules.

## 10. Moderation, suspension, and termination {#termination}

- We may remove content, reset a username or league name, remove a member from a league, suspend or end your account, or close a league if we believe you broke these Terms, created risk or legal exposure for us or others, or if the law requires it. When reasonable, we will tell you why.
- You can stop using the Service and ask us to delete your account at any time (see the [Privacy Policy](/privacy#delete-your-data)).
- If your account is ended for breaking these Terms, fees you paid are not refunded, except where the law requires. If we close a league before its draft starts for a reason that is not caused by its members, the fees for that league are refunded under the [Refund & Cancellation Policy](/refunds).
- Sections 6, 8 (license for backups and legal copies), and 11 through 21 continue after your account ends.

## 11. Shows, trademarks, and no affiliation {#no-affiliation}

${C.product} is an independent, fan-made product of ${C.legalName}. **We are not affiliated with, endorsed by, or sponsored by the BBC, ABC, The Walt Disney Company, or any show, network, studio, production company, or cast member.** Show names, cast names, and other trademarks belong to their owners. We use them only to describe the content of a league (for example, which show a league follows). We do not use show logos or photos.

## 12. Our intellectual property {#our-ip}

The Service, including its software, design, text, scoring system, and the ${C.product} name and look, belongs to ${C.legalName} or its licensors and is protected by law. We give you a personal, limited, non-transferable, revocable right to use the Service for your own non-commercial use under these Terms. If you send us ideas or feedback, we may use them without paying you or owing you anything.

## 13. Copyright and IP complaints (DMCA) {#copyright}

We respect intellectual property rights and respond to notices under the Digital Millennium Copyright Act (DMCA).

If you believe content on the Service infringes your copyright, send a notice to our designated agent:

- **Copyright Agent:** ${C.legalName}, Attn: Copyright Agent, ${C.address}
- **Email:** ${EMAIL} (subject line "DMCA Notice")

Your notice must include:

1. Your physical or electronic signature.
2. A description of the copyrighted work you believe was infringed.
3. A description of the content you want removed and where it is on the Service (a link or league and page name).
4. Your name, mailing address, phone number, and email address.
5. A statement that you believe in good faith that the use is not authorized by the copyright owner, its agent, or the law.
6. A statement, under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized to act for the owner.

**Counter-notice.** If your content was removed and you believe it was a mistake or misidentification, you may send us a counter-notice with: your signature; a description of the removed content and where it appeared; a statement under penalty of perjury that you believe in good faith it was removed by mistake or misidentification; your name, address, and phone number; and a statement that you consent to the jurisdiction of the federal district court for your address (or, if you are outside the United States, any judicial district where we may be found) and will accept service of process from the person who sent the original notice. We may restore the content in 10 to 14 business days unless the complaining party tells us it has filed a court action.

**Repeat infringers.** We will end the accounts of users who repeatedly infringe others' rights.

**Trademark and other complaints.** For trademark or other IP concerns, email ${EMAIL} with the same kind of detail.

## 14. Third-party services {#third-parties}

The Service relies on other companies, such as Stripe for payments and Supabase for accounts and data (see the [Privacy Policy](/privacy#service-providers)). We are not responsible for their services, websites, or terms. Links to other websites are for convenience only.

## 15. Changes to the Service {#changes-to-service}

We may add, change, or remove features, shows, or seasons at any time. We may also stop offering the Service. If we shut down the Service while a league's draft has not started, we will refund that league's fees under the [Refund & Cancellation Policy](/refunds).

## 16. Disclaimers {#disclaimers}

THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE." TO THE FULLEST EXTENT THE LAW ALLOWS, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. We do not promise that the Service will be uninterrupted, error-free, or secure, that scores will be accurate or on time, or that any show will air as scheduled.

## 17. Limitation of liability {#liability}

TO THE FULLEST EXTENT THE LAW ALLOWS:

- ${C.legalName} AND ITS MEMBERS, MANAGERS, AND CONTRACTORS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, LOST DATA, OR LOSS OF GOODWILL, ARISING FROM OR RELATED TO THE SERVICE OR THESE TERMS.
- OUR TOTAL LIABILITY FOR ALL CLAIMS RELATED TO THE SERVICE OR THESE TERMS WILL NOT BE MORE THAN THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE 12 MONTHS BEFORE THE CLAIM, OR (B) $50.
- WE ARE NOT RESPONSIBLE FOR MONEY OR ANYTHING ELSE EXCHANGED BETWEEN USERS, FOR THE CONDUCT OF ANY USER OR COMMISSIONER, OR FOR THIRD-PARTY SERVICES.

Some places do not allow some of these limits, so they may not all apply to you.

## 18. Indemnity {#indemnity}

To the extent the law allows, you agree to defend and hold harmless ${C.legalName} and its members, managers, and contractors from claims, losses, and costs (including reasonable attorneys' fees) that come from your content, your misuse of the Service, your breaking these Terms or the law, or any money or arrangement between you and other users.

## 19. Governing law and disputes {#disputes}

- These Terms are governed by the laws of the **State of ${C.state}** and applicable U.S. federal law, without regard to conflict-of-law rules.
- Before filing a claim, please email ${EMAIL} and give us 30 days to try to resolve it informally.
- Any lawsuit about the Service or these Terms must be brought only in the state or federal courts located in **${C.venue}**, and you and we consent to those courts' jurisdiction. Either of us may instead bring an individual claim in small claims court if it qualifies.
- Any claim must be brought within one year after it arises, unless the law requires a longer period.

## 20. Changes to these Terms {#changes}

We may update these Terms. We will post the new version here with a new effective date. If a change is material, we will give notice in the Service or by email before it takes effect. If you keep using the Service after the change takes effect, you accept the new Terms. If you do not agree, stop using the Service and you may ask us to delete your account.

## 21. General {#general}

- These Terms, together with the policies linked above, are the entire agreement between you and us about the Service.
- If any part is found unenforceable, the rest stays in effect.
- If we do not enforce a part of these Terms, that is not a waiver.
- You may not transfer these Terms without our consent. We may transfer them in connection with a merger, sale, or reorganization.
- Nothing in these Terms creates a partnership, employment, or agency relationship.
- You agree we can send you notices electronically, such as by email or in the Service.

## 22. Contact {#contact}

${C.legalName}, ${C.address}. Email: ${EMAIL}. See [Contact & Support](/contact).
`,
};

const privacy: LegalDoc = {
  slug: "privacy",
  docName: "Privacy Policy",
  navLabel: "Privacy",
  summary: "What we collect, why, who helps us run the Service, cookies and local storage, your privacy rights, and how to delete your data.",
  body: `
This Privacy Policy explains how ${C.legalName}, ${C.entity} ("we," "us," or "our"), collects, uses, and shares information when you use ${C.product} at ${C.domain} (the "Service"). It includes our **Cookie Notice** ([Section 6](#cookies)) and our **Notice at Collection** for California residents ([Section 10](#california)).

**The short version:** we collect only what we need to run your account and leagues. Card details go straight to Stripe; we never store card numbers. **We do not sell your personal information, and we do not share it for targeted advertising.**

## 1. Information we collect {#what-we-collect}

**Information you give us**

- **Account information:** your email address, username, and password. Passwords are handled by our authentication provider, Supabase Auth, and are stored only in hashed form. We never see or store your password in plain text.
- **Age confirmation:** when you sign up, we ask you to confirm you are at least 13 (for example, by entering your birth year). We use this only to check that you are allowed to use the Service.
- **League information:** leagues you create or join, league settings, team names, draft picks and draft order, scores and score corrections, your role (commissioner or member), invite codes, and which league spots are paid and who paid for them.
- **Preferences:** your theme choice.
- **Messages to us:** what you send when you email support, including your email address.

**Payment information**

Payments are processed by **Stripe**. You enter your card details on Stripe's secure checkout, not on our servers. **We never receive or store your full card number or security code.** Stripe tells us the result of a payment and gives us limited details, such as the amount, date, a transaction ID, and sometimes the card brand, last four digits, and billing country or ZIP code.

**Information collected automatically**

- **Technical and log data:** IP address, browser and device type, operating system, pages visited, referring page, and the date and time of requests. Our hosting provider records this to deliver and secure the Service.
- **Error reports:** if something breaks, our error-monitoring provider records technical details about the error, such as the page, browser, time, and an account ID, so we can fix it.
- **Cookies and local storage:** see the [Cookie Notice](#cookies).

We do not collect precise location, contacts, photos, or biometric information, and we do not ask for your real name.

## 2. How we use information {#how-we-use}

- To create and secure your account and let you log in.
- To run leagues, drafts, standings, and scores, and to show league information to the members of your league.
- To process the $5 platform fee, issue refunds, and keep financial and tax records.
- To send service emails, such as account verification, password resets, payment receipts, league invites, and reminders. We do not send marketing email unless you choose to receive it, and you can unsubscribe at any time.
- To provide support and respond to your requests.
- To keep the Service safe: preventing fraud, spam, and abuse, and enforcing our [Terms of Service](/terms).
- To fix bugs and improve the Service.
- To follow the law and respond to valid legal requests.

## 3. What other users can see {#other-users}

Members of a league you join can see your username and display name, your team name, your picks and scores, your role, and whether your spot is paid (and, if someone else covered it, who paid). Other users never see your email address or payment details.

## 4. Who we share information with {#service-providers}

We share personal information only with companies that help us run the Service ("service providers" or "processors"). They may use it only to provide their services to us.

| Provider | What they do for us | Information involved |
| --- | --- | --- |
| Supabase | Database and user authentication | Account, league, and preference data; hashed passwords |
| Stripe | Payment processing and refunds | Payment details you enter at checkout; amount; email |
| Resend | Sending service emails | Email address and email content |
| Sentry | Error monitoring | Technical and error data; account ID |
| Vercel | Website hosting and delivery | Technical and log data |

**Analytics.** We do not currently use third-party analytics or advertising tools. If we add an analytics provider, we will update this policy and the table above before turning it on, and we will not use it for targeted advertising.

We may also share information:

- **When the law requires it**, or to respond to valid legal process, protect someone's safety, or protect our rights and users.
- **In a business transfer**, such as a merger, sale, or reorganization of ${C.legalName}, in which case this policy will continue to apply to your information.
- **With your permission.**

**We do not sell personal information, and we do not "share" it for cross-context behavioral advertising** (as those terms are defined in California law). We have not done so in the past 12 months.

## 5. How long we keep information {#retention}

- **Account and league data:** for as long as your account is open. After you delete your account, we delete or anonymize it from our active systems within 30 days. Copies in backups are overwritten within 90 days.
- **Payment and refund records:** kept as long as needed for tax, accounting, and legal purposes (generally up to 7 years). These records do not include full card numbers.
- **Logs and error reports:** generally kept no longer than 90 days.
- **Support emails:** kept as long as needed to help you and for our records, generally up to 2 years.

## 6. Cookie Notice: cookies and local storage {#cookies}

Cookies are small files a website saves in your browser. Local storage is a similar browser feature that saves settings on your device. We use them only for the purposes below.

| Name or type | Where | Purpose | How long |
| --- | --- | --- | --- |
| Login session cookies (Supabase Auth) | Cookie on ${C.domain} | Keep you logged in and protect your account. Strictly necessary. | Until you log out or the session expires |
| dts-theme | Local storage on your device | Remembers your theme choice so pages show your colors before they load. Strictly necessary for your chosen preference. | Until you clear it or change theme |
| Stripe checkout cookies | Set by Stripe on Stripe's checkout pages | Process payments and prevent fraud. | Set by Stripe (see Stripe's privacy policy) |
| Security and performance (Vercel) | Our hosting provider | Deliver pages and protect against attacks. | Short-lived |

- **No advertising or tracking cookies.** We do not use cookies to show you ads or track you across other websites.
- **Your choices.** You can block or delete cookies and clear local storage in your browser settings. If you block login cookies, you will not be able to log in. If you clear local storage, your theme resets on that device.
- **Global Privacy Control and Do Not Track.** We honor the Global Privacy Control (GPC) signal as a request to opt out of the sale or sharing of personal information. Because we do not sell or share personal information for advertising, no further action is needed.
- If we ever add analytics or other non-essential cookies, we will update this notice first and ask for your consent where the law requires it.

## 7. Your choices and rights {#your-rights}

Wherever you live, you can ask us to:

- **Access** the personal information we have about you, or get a copy in a portable format.
- **Correct** information that is wrong. You can change your username and theme yourself in Settings.
- **Delete** your account and personal information (see [Section 8](#delete-your-data)).
- **Stop marketing emails** by using the unsubscribe link. Service emails (like receipts and password resets) are part of having an account.

To make a request, email ${EMAIL} from the email address on your account, with the subject line "Privacy Request." We will confirm your identity by checking that the request comes from your account email, and we may ask for more information if needed. We will respond within 45 days. If we need more time (up to another 45 days), we will tell you why. You may use an authorized agent; we will ask the agent for proof of your permission and may ask you to confirm your identity with us directly. We will not treat you differently for using your privacy rights.

## 8. Data deletion requests {#delete-your-data}

You can ask us to delete your account at any time by emailing ${EMAIL} from your account email with the subject line "Delete My Account."

What happens next:

1. We confirm the request came from your account email.
2. We delete your account, email address, password hash, and preferences, and we delete or anonymize your league information. In leagues that have already drafted, your team may stay so other members' standings still work, but it will no longer be linked to you and will show as "Deleted user."
3. If you are the commissioner of a league, we will ask you to hand the commissioner role to another member first. If the league has not drafted and no one takes over, the league is cancelled and paid fees are refunded to whoever paid them, under the [Refund & Cancellation Policy](/refunds).
4. We keep only what the law requires us to keep, such as payment records for taxes, and we delete it when it is no longer needed.
5. We complete deletion within 30 days of confirming your request and tell you when it is done. Backups are overwritten within 90 days.

Deleting your account does not by itself refund fees for leagues that have already drafted.

## 9. Children and teens {#children}

- **Children under 13:** The Service is not for children under 13, and we do not knowingly collect personal information from them, in line with the Children's Online Privacy Protection Act (COPPA). If we learn that a child under 13 has created an account, we will delete the account and its information. If you believe a child under 13 has given us information, email ${EMAIL}.
- **Teens 13 to 17:** Teens may use the Service only with a parent's or guardian's consent, and a parent or guardian must make or approve any payment. A parent or guardian may contact us to review or delete their teen's information.
- We do not sell or share the personal information of anyone, including users under 16.

## 10. California privacy rights (CCPA/CPRA) {#california}

This section applies to California residents and supplements the rest of this policy. It also serves as our Notice at Collection.

**Categories of personal information we collect and why**

| Category | Examples | Purposes | Disclosed to |
| --- | --- | --- | --- |
| Identifiers | Email address, username, account ID, IP address | Running your account and leagues, security, support | Supabase, Resend, Sentry, Vercel, Stripe |
| Commercial information | League fees paid, refunds, transaction IDs | Payments, refunds, records | Stripe, Supabase |
| Internet or network activity | Pages visited, browser and device data, error data | Delivering, securing, and fixing the Service | Vercel, Sentry |
| Account login credentials (sensitive) | Email and hashed password | Logging you in only | Supabase |
| Age information | Confirmation that you are 13 or older | Checking eligibility | Supabase |
| Other user content | League, team, and pick information; theme choice | Running leagues and showing your preferences | Supabase |

- **Sources:** you, your device, other league members (for example, a commissioner who adds you to a draft order or covers your fee), and Stripe.
- **Retention:** see [Section 5](#retention).
- **Sale and sharing:** we do not sell or share personal information for cross-context behavioral advertising, and we have not in the past 12 months.
- **Sensitive personal information:** we use it only to provide the Service, as allowed by law, and not to infer things about you.

**Your California rights.** You have the right to know what personal information we collect, use, and disclose; to access it; to delete it; to correct it; to opt out of its sale or sharing (we do neither); to limit the use of sensitive personal information (we already use it only as allowed); and not to be discriminated against for using these rights. To use your rights, follow [Section 7](#your-rights). "Shine the Light": we do not share personal information with third parties for their own direct marketing.

Some of these laws apply only to businesses above certain size thresholds. We offer these rights to all users anyway.

## 11. Security {#security}

We use reasonable safeguards, including encrypted connections (HTTPS), hashed passwords, access controls in our database, and limiting who can see personal information. No system is perfectly secure. If we learn of a breach that affects your personal information, we will notify you as the law requires.

## 12. Where your information is processed {#location}

${C.legalName} is based in the United States, and our providers process information in the United States. The Service is intended for users in the United States.

## 13. Changes to this policy {#changes}

We may update this policy. We will post the new version here with a new effective date. If a change is material, we will tell you in the Service or by email before it takes effect.

## 14. Contact {#contact}

Questions or requests: ${EMAIL}, or by mail to ${MAIL}. See [Contact & Support](/contact).
`,
};

const refunds: LegalDoc = {
  slug: "refunds",
  docName: "Refund & Cancellation Policy",
  navLabel: "Refunds",
  summary: "Full refund to whoever paid if a member leaves or a league is cancelled before the draft. No refunds after the draft starts, except where the law requires.",
  body: `
This policy explains refunds of the $5 platform fee on ${C.product}, operated by ${C.legalName}. It is part of our [Terms of Service](/terms).

**The short version:** before the draft starts, a member leaving or a league being cancelled means a **full refund to whoever paid** for that spot. **After the draft starts, fees are not refundable, except where the law requires.**

## 1. Before the draft starts: full refunds {#before-draft}

You get a full refund of the $5 fee for a league spot if, **before that league's draft starts**:

- **A member leaves the league**, or the commissioner removes them; or
- **The league is cancelled**, whether by the commissioner, by us, or because we stop offering the Service.

The refund is the full amount paid. We do not deduct processing fees.

## 2. Who gets the refund {#who-gets-it}

The refund always goes to **the person who paid** for that spot, back to the payment method they used.

- If you paid your own fee, the refund goes to you.
- If the commissioner (or anyone else) covered your spot, the refund goes to them, not to you.
- If the commissioner paid for an open spot that no one has claimed, the refund goes to the commissioner.

When a member leaves before the draft, their spot becomes open and unpaid again, and the league needs every spot filled and paid before the draft can start.

## 3. After the draft starts: no refunds {#after-draft}

Once a league's draft has started, **fees are not refundable, except where the law requires.** This includes when:

- a member leaves, is removed, or stops playing;
- a member's picks are eliminated from the show or the member loses interest;
- a show airs late, changes format, is shortened, or is cancelled; or
- an account is suspended or ended for breaking the [Terms of Service](/terms).

## 4. Billing errors {#billing-errors}

If you were charged by mistake, such as a duplicate charge, the wrong amount, or a charge for a spot you did not choose to pay for, email us and we will correct it, whether or not the draft has started.

## 5. How and when refunds are paid {#how}

- Refunds before the draft are started automatically when a member leaves or a league is cancelled. If you think you are owed a refund and have not received it, email ${EMAIL} with the league name and the date you paid.
- Refunds are issued through Stripe to the original payment method. They usually appear within 5 to 10 business days, depending on your bank or card issuer.
- We can only refund to the original payment method.

## 6. Money between members {#off-platform}

We only refund the platform fees we collected. Any money that league members collect from, owe to, or pay each other is **off-platform** and **not our responsibility**. We do not hold it, track it, refund it, or settle disputes about it. See the [Platform Fee & No-Prize Disclosure](/fees-disclosure).

## 7. Chargebacks {#chargebacks}

Please contact us before disputing a charge with your bank; we can usually fix problems quickly. If a charge is disputed, the related league spot may be marked unpaid while the dispute is open.

## 8. Cancelling your account {#cancel-account}

Accounts are free, so there is nothing to cancel to stop being charged; the fee is a one-time charge per league spot, never a subscription. If you delete your account, leagues that have not drafted are handled as described in Section 1, and fees for leagues that have already drafted are not refunded. See the [Privacy Policy](/privacy#delete-your-data).

## 9. Contact {#contact}

Refund questions: ${EMAIL} (subject line "Refund"). Mail: ${MAIL}.
`,
};

const fees: LegalDoc = {
  slug: "fees-disclosure",
  docName: "Platform Fee & No-Prize Disclosure",
  navLabel: "Fee & No-Prize Disclosure",
  summary: "What the $5 platform fee is, what it pays for, and why there are no prizes, payouts, or prize pools.",
  body: `
${C.product} is operated by ${C.legalName}. This disclosure explains exactly what you are paying for. It is part of our [Terms of Service](/terms).

## 1. The fee {#the-fee}

- **Accounts are free. Creating a league is free.**
- Each league member pays a **one-time $5.00 (USD) platform fee for each league** they join. It is not a subscription and is never charged again for that league.
- The **commissioner can pay the fee for other members**, including open spots, in one checkout.
- **The draft cannot start until every spot in the league is filled and paid.**
- If any sales tax applies, it will be shown at checkout before you pay.

## 2. What the fee pays for {#what-it-pays-for}

The fee pays only for running the platform: hosting, the database, account security, email, weekly score updates, customer support, payment processing, and building new features.

The fee is the same for every member and does not change based on how anyone does in the league.

## 3. No prizes, payouts, or prize pools {#no-prizes}

- **We do not award prizes, cash, gift cards, merchandise, or anything else of value** to any user for how they finish in a league.
- **No fees are pooled, held, or paid out to users.** There is no prize pool.
- Winning a league earns bragging rights only.
- Paying the fee does not give you a chance to win anything from us.

## 4. Not gambling {#not-gambling}

${C.product} is a fan game with free accounts and a flat platform fee. **It is not gambling, betting, a lottery, a sweepstakes, or a paid fantasy contest.** We do not take bets, set odds, or pay winnings. Leagues may not use the Service to run or advertise gambling (see the [Acceptable Use rules](/terms#acceptable-use)).

## 5. Money between members is off-platform {#off-platform}

If members of a league choose to collect money from each other, pay each other back for covered fees, or make any other arrangement, that happens **off-platform** and is **not our responsibility**. We do not hold, track, collect, distribute, or enforce it, and we will not settle disputes about it. You are responsible for following the laws where you live.

## 6. Payments and refunds {#payments}

- Payments are processed securely by **Stripe**. **We never store your card number.**
- Before the draft starts, if a member leaves or the league is cancelled, the fee is refunded in full to whoever paid it. **No refunds after the draft starts, except where the law requires.** See the [Refund & Cancellation Policy](/refunds).

## 7. No affiliation {#no-affiliation}

${C.product} is fan-made and **not affiliated with, endorsed by, or sponsored by the BBC, ABC, The Walt Disney Company, or any show, network, or production company**. Show names are used only to describe league content.

## 8. Questions {#contact}

Email ${EMAIL}. Mail: ${MAIL}.
`,
};

const contact: LegalDoc = {
  slug: "contact",
  docName: "Contact & Support",
  navLabel: "Contact",
  summary: `How to reach ${C.legalName} for help, refunds, privacy and deletion requests, copyright notices, and legal notices.`,
  body: `
${C.product} is operated by **${C.legalName}**, ${C.entity}.

## Support {#support}

- **Email:** ${EMAIL}
- We aim to reply within 2 business days.
- Please include your username, the league name, and what happened. **Never send your password or card number by email.** We will never ask for them.

## Common requests {#requests}

| What you need | How to reach us |
| --- | --- |
| Help with your account, a league, a draft, or scores | Email ${EMAIL} |
| A refund or a billing question | Email ${EMAIL} with the subject "Refund." See the [Refund & Cancellation Policy](/refunds) |
| A copy of your data, a correction, or other privacy request | Email from your account email with the subject "Privacy Request." See the [Privacy Policy](/privacy#your-rights) |
| Delete your account and data | Email from your account email with the subject "Delete My Account." See [Data deletion requests](/privacy#delete-your-data) |
| Report abuse or content that breaks the rules | Email ${EMAIL} with the username or league name. See [Acceptable Use](/terms#acceptable-use) |
| Copyright (DMCA) notice | Email ${EMAIL} with the subject "DMCA Notice," or mail our Copyright Agent. See [Copyright and IP complaints](/terms#copyright) |
| A parent or guardian asking about a child's or teen's account | Email ${EMAIL}. See [Children and teens](/privacy#children) |

## Mailing address for legal notices {#mail}

${C.legalName}, Attn: Legal / Copyright Agent, ${C.address}

## Policies {#policies}

- [Terms of Service](/terms) (includes [Acceptable Use](/terms#acceptable-use))
- [Privacy Policy](/privacy) (includes the [Cookie Notice](/privacy#cookies))
- [Refund & Cancellation Policy](/refunds)
- [Platform Fee & No-Prize Disclosure](/fees-disclosure)

${C.product} is fan-made and not affiliated with the BBC, ABC, The Walt Disney Company, or any show, network, or production company.
`,
};

export const LEGAL_DOCS: Record<LegalSlug, LegalDoc> = { terms, privacy, refunds, "fees-disclosure": fees, contact };

export const driveTitle = (d: LegalDoc) => `${C.product} – ${d.docName} (Effective ${C.effectiveShort})`;
