"use client";
/** One-tap invite sharing: Web Share, copy link, and a QR code. */
import { useEffect, useState, useSyncExternalStore } from "react";
import QRCode from "qrcode";
import { appAbsoluteUrl, copyText, shareOrCopy } from "@/lib/share-url";

const emptySubscribe = () => () => {};

export function InviteShare({ code, joinPath }: { code: string; joinPath: string }) {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("");
  const url = mounted ? appAbsoluteUrl(joinPath) : joinPath;

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    QRCode.toDataURL(url, { width: 160, margin: 1, color: { dark: "#2b2233", light: "#ffffff" } })
      .then((data) => { if (!cancelled) setQr(data); })
      .catch(() => { if (!cancelled) setQr(null); });
    return () => { cancelled = true; };
  }, [url, mounted]);

  const flash = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(""), 2000);
  };

  const onShare = async () => {
    const absolute = appAbsoluteUrl(joinPath);
    const result = await shareOrCopy({
      title: "Join my Draft the Stars league",
      text: `Join with code ${code}`,
      url: absolute,
    });
    if (result === "shared") flash("Shared!");
    else if (result === "copied") { setCopied(true); flash("Copied!"); setTimeout(() => setCopied(false), 2000); }
    else flash("Share unavailable");
  };

  const onCopy = async () => {
    const ok = await copyText(appAbsoluteUrl(joinPath));
    if (ok) { setCopied(true); flash("Copied!"); setTimeout(() => setCopied(false), 2000); }
    else flash("Copy failed");
  };

  return (
    <div className="invite-share stack" data-testid="invite-share">
      <div className="row">
        <button type="button" className="primary" onClick={onShare} data-testid="invite-share-btn">Share</button>
        <button type="button" onClick={onCopy} data-testid="invite-copy-btn">{copied ? "Copied!" : "Copy link"}</button>
      </div>
      {status && <p className="hint" role="status" style={{ margin: 0 }}>{status}</p>}
      {mounted && <p className="hint" style={{ margin: 0, wordBreak: "break-all" }}>{url}</p>}
      {qr && (
        <figure className="invite-qr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`QR code for invite ${code}`} width={160} height={160} />
          <figcaption className="hint">Scan to join</figcaption>
        </figure>
      )}
    </div>
  );
}
