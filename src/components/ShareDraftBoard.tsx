"use client";
/** Share a completed draft board: Web Share / copy, plus optional PNG download. */
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { appAbsoluteUrl, copyText, shareOrCopy } from "@/lib/share-url";

export function ShareDraftBoard({
  leagueName,
  leaguePath,
  boardSelector = "[data-draft-board]",
  summary,
}: {
  leagueName: string;
  leaguePath: string;
  boardSelector?: string;
  summary: string;
}) {
  const [status, setStatus] = useState("");
  const busy = useRef(false);

  const flash = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(""), 2500);
  };

  const url = () => appAbsoluteUrl(leaguePath);

  const onShare = async () => {
    const result = await shareOrCopy({
      title: `${leagueName} draft board`,
      text: summary,
      url: url(),
    });
    if (result === "shared") flash("Shared!");
    else if (result === "copied") flash("Copied!");
    else flash("Share unavailable");
  };

  const onCopy = async () => {
    const ok = await copyText(`${summary}\n${url()}`);
    flash(ok ? "Copied!" : "Copy failed");
  };

  const onDownload = async () => {
    if (busy.current) return;
    const el = document.querySelector(boardSelector) as HTMLElement | null;
    if (!el) { flash("Board not found"); return; }
    busy.current = true;
    try {
      const dataUrl = await toPng(el, { cacheBust: true, pixelRatio: 2, backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--surface").trim() || "#fff" });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${leagueName.replace(/[^\w]+/g, "-").toLowerCase()}-draft-board.png`;
      a.click();
      flash("Image saved");
    } catch {
      flash("Image export failed — link copied instead");
      await copyText(`${summary}\n${url()}`);
    } finally {
      busy.current = false;
    }
  };

  return (
    <div className="row" data-testid="share-draft-board">
      <button type="button" className="primary" onClick={onShare}>Share draft board</button>
      <button type="button" onClick={onCopy}>Copy link</button>
      <button type="button" className="ghost" onClick={onDownload}>Download image</button>
      {status && <span className="hint" role="status">{status}</span>}
    </div>
  );
}
