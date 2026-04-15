import { Link, useLocation } from "react-router-dom";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useMemo } from "react";

export default function Navigation() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const location = useLocation();

  const walletShort = useMemo(() => {
    if (!address) return "Connect wallet";
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }, [address]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar__container">
        <Link to="/" className="navbar__logo" aria-label="PayShield home">
          <span className="navbar__logo-mark" aria-hidden="true">
            <img src="/payshield-logo.svg" alt="PayShield" className="navbar__logo-img" />
          </span>
          <span className="navbar__logo-text">PayShield</span>
        </Link>

        <ul className="navbar__links">
          <li>
            <Link to="/" className={`navbar__link ${isActive("/") ? "active" : ""}`}>
              Home
            </Link>
          </li>
          <li>
            <Link to="/employer" className={`navbar__link ${isActive("/employer") ? "active" : ""}`}>
              Employer
            </Link>
          </li>
          <li>
            <Link to="/contractor" className={`navbar__link ${isActive("/contractor") ? "active" : ""}`}>
              Contractor
            </Link>
          </li>
          <li>
            <Link to="/pool" className={`navbar__link ${isActive("/pool") ? "active" : ""}`}>
              Pool
            </Link>
          </li>
        </ul>

        <div className="navbar__wallet">
          {isConnected ? (
            <div className="navbar__wallet-connected">
              <div className="wallet-badge">{walletShort}</div>
              <button className="button button--secondary button-sm" onClick={() => disconnect()}>
                Disconnect
              </button>
            </div>
          ) : (
            <div className="connect-row" aria-label="Available wallet connectors">
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  className="connect-pill"
                  onClick={() => connect({ connector })}
                >
                  {connector.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
