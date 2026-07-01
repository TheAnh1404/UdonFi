import { Database } from "lucide-react";
import { StellarExpertLink } from "./StellarExpertLink";
import type { ContractConfig } from "../../services/contracts";

type PoolCardProps = {
  config: ContractConfig;
  reserveCount?: number;
  reserveInfo?: Record<string, unknown>;
  overviewError?: string;
};

const displayValue = (value: unknown) => {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (value === undefined || value === null) {
    return "Not available";
  }

  return String(value);
};

export const PoolCard = ({ config, reserveCount, reserveInfo, overviewError }: PoolCardProps) => {
  const contractRows = [
    ["Lending pool", config.lendingPoolId],
    ["aToken", config.aTokenId],
    ["Debt token", config.debtTokenId],
    ["Reserve", config.reserveId],
    ["Price oracle", config.priceOracleId],
    ["Liquidation", config.liquidationId],
  ];

  return (
    <section className="pool-panel">
      <div className="section-heading">
        <span>Contracts</span>
        <Database size={18} aria-hidden="true" />
      </div>

      <div className="contract-grid">
        {contractRows.map(([label, id]) => (
          <div className="contract-row" key={label}>
            <span>{label}</span>
            <StellarExpertLink id={id} type="contract" />
          </div>
        ))}
      </div>

      <div className="metric-grid">
        <div className="metric">
          <span>Reserve count</span>
          <strong>{reserveCount ?? "Not loaded"}</strong>
        </div>
        <div className="metric">
          <span>Default asset</span>
          <StellarExpertLink id={config.defaultAssetId} type="contract" label="XLM SAC" />
        </div>
        <div className="metric">
          <span>Borrowing enabled</span>
          <strong>{displayValue(reserveInfo?.is_borrowing_enabled)}</strong>
        </div>
        <div className="metric">
          <span>Liquidation threshold</span>
          <strong>{displayValue(reserveInfo?.liquidation_threshold)}</strong>
        </div>
      </div>

      {overviewError ? <div className="warning-box">{overviewError}</div> : null}
    </section>
  );
};
