import { ExternalLink } from "lucide-react";
import { contractUrl, transactionUrl } from "../../services/stellarExpert";

type StellarExpertLinkProps = {
  id?: string;
  type: "contract" | "tx";
  label?: string;
};

export const StellarExpertLink = ({ id, type, label }: StellarExpertLinkProps) => {
  if (!id) {
    return <span className="empty-value">Not set</span>;
  }

  const href = type === "tx" ? transactionUrl(id) : contractUrl(id);
  const text = label || `${id.slice(0, 6)}...${id.slice(-6)}`;

  return (
    <a className="expert-link" href={href} target="_blank" rel="noreferrer">
      <span>{text}</span>
      <ExternalLink size={14} aria-hidden="true" />
    </a>
  );
};
