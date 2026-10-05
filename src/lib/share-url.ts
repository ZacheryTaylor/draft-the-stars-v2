/**
 * Build an absolute URL for share/copy, respecting the demo basePath
 * (/draft-the-stars-v2 on GitHub Pages; empty on the server app).
 */
export function appAbsoluteUrl(appPath: string): string {
  if (typeof window === "undefined") return appPath;
  const path = appPath.startsWith("/") ? appPath : `/${appPath}`;
  const known = "/draft-the-stars-v2";
  const base = window.location.pathname.startsWith(known + "/") || window.location.pathname === known ? known : "";
  return `${window.location.origin}${base}${path}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export async function shareOrCopy(input: { title: string; text: string; url: string }): Promise<"shared" | "copied" | "failed"> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share(input);
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "failed";
      // fall through to copy
    }
  }
  return (await copyText(`${input.text}\n${input.url}`)) ? "copied" : "failed";
}
