import { RefreshCw, ShieldCheck } from "lucide-react";

type HealthFactorCardProps = {
  healthFactor?: string;
  supplied?: string;
  debt?: string;
  isLoading: boolean;
  disabled: boolean;
  onRefresh: () => void;
};

export const HealthFactorCard = ({
  healthFactor,
  supplied,
  debt,
  isLoading,
  disabled,
  onRefresh,
}: HealthFactorCardProps) => {
  const numericHealth = Number(healthFactor);
  const stateLabel = Number.isFinite(numericHealth) && numericHealth < 1 ? "Liquidatable" : "Healthy";

  return (
    <section className="health-panel">
      <div className="section-heading">
        <span>Health Factor</span>
        <button className="icon-button" type="button" onClick={onRefresh} disabled={disabled || isLoading} title="Refresh">
          <RefreshCw className={isLoading ? "spin" : ""} size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="health-value">
        <ShieldCheck size={24} aria-hidden="true" />
        <strong>{isLoading ? "Loading" : healthFactor || "Not loaded"}</strong>
        <span className={stateLabel === "Healthy" ? "state-ok" : "state-danger"}>{stateLabel}</span>
      </div>

      <div className="metric-grid two">
        <div className="metric">
          <span>Supplied XLM</span>
          <strong>{supplied || "0"}</strong>
        </div>
        <div className="metric">
          <span>Debt XLM</span>
          <strong>{debt || "0"}</strong>
        </div>
      </div>
    </section>
  );
};
