// The seven hardest caregiver questions, in plain language, with
// links into the in-app surfaces that prove each answer. Shared
// between the standalone /faq page and the landing-page preview
// so they never drift out of sync.

export type FaqEntry = {
  id: string;
  question: string;
  // Markdown-ish: each entry is rendered as a small paragraph plus
  // an optional inline link. We keep this shape deliberately simple
  // (no real markdown parser) so the answers stay short.
  answer: string;
  link?: { label: string; href: string };
};

export const FAQS: FaqEntry[] = [
  {
    id: "can-mom-see",
    question: "Can mom see what I see?",
    answer:
      "Yes, if she wants to. The household belongs to the person whose bills are being watched, and she can be added as a member with the same view as the rest of the family. Many families choose to keep her as the Primary user from day one. Nothing in Kindue is hidden from the person whose finances we're watching.",
    link: { label: "How household members work", href: "/security" },
  },
  {
    id: "remove-caregiver",
    question: "Can a caregiver be removed?",
    answer:
      "Yes, instantly. The Primary user opens the Household page, finds the caregiver, and removes them in one click. Their access is revoked immediately and the change is recorded in the audit log so the rest of the family can see who was removed and when.",
    link: { label: "Manage household members", href: "/household" },
  },
  {
    id: "no-smartphone",
    question: "What if mom doesn't have a smartphone?",
    answer:
      "Kindue works without her ever signing in. As long as her bills land in an inbox a caregiver can connect — usually her existing email — the family can see and act on them. She can stay completely off-app and still have her bills covered.",
    link: {
      label: "See the spouse and family scenarios",
      href: "/who-its-for",
    },
  },
  {
    id: "power-of-attorney",
    question: "Is this legal without a power of attorney?",
    answer:
      "Yes. Kindue never moves money, signs anything, or speaks to a provider on her behalf. We just read bills she already receives and surface them to people she has chosen to share access with. No power of attorney is required to use the product, and we recommend talking with a family attorney before granting one.",
    link: { label: "How read-only access works", href: "/security" },
  },
  {
    id: "cost-to-mom",
    question: "Does this cost mom money?",
    answer:
      "No. The caregiver who creates the household pays — never the person being watched over. Family Free covers one caregiver, and Family Plus is the same flat price no matter whose bills you're tracking. We don't take a percentage of anything we save you.",
    link: { label: "See pricing", href: "/pricing" },
  },
  {
    id: "siblings-see-everything",
    question: "Will my siblings see everything I do?",
    answer:
      "They'll see the same bills you do and they'll see who marked what paid — because that's how families avoid stepping on each other. They will not see your private notes, your inbox, or anything outside this household. Roles also let you grant alerts-only access to a sibling who wants to be in the loop without admin powers.",
    link: { label: "Visibility model", href: "/security" },
  },
  {
    id: "data-on-cancel",
    question: "What happens to her data if I cancel?",
    answer:
      "You can export everything as a printable monthly statement and a CSV of bills first. Then the Primary user can delete the household with one confirmation — every bill, document, and notification is permanently removed. We don't keep a shadow copy or a 'just in case' backup.",
    link: { label: "Delete a household", href: "/settings/delete-data" },
  },
];
