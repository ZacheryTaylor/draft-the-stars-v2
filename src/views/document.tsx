import { Grand_Hotel, Quicksand } from "next/font/google";
import { THEME_IDS, THEME_STORAGE_KEY, themeCss } from "@/lib/themes/presets";

const quicksand = Quicksand({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-quicksand", display: "swap", preload: false });
const grandHotel = Grand_Hotel({ subsets: ["latin"], weight: "400", variable: "--font-grand-hotel", display: "swap", preload: false });
export const fontClassNames = `${quicksand.variable} ${grandHotel.variable}`;

// Runs before paint: apply the localStorage theme unless a profile theme was rendered by the server.
const themeBootstrap = `(function(){try{var d=document.documentElement;if(d.getAttribute('data-theme-source')==='profile'){localStorage.setItem('${THEME_STORAGE_KEY}',d.getAttribute('data-theme'));return;}var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(${JSON.stringify(THEME_IDS)}.indexOf(t)>-1)d.setAttribute('data-theme',t);}catch(e){}})();`;

export function ThemeHead() {
  return (
    <>
      <style id="theme-tokens" dangerouslySetInnerHTML={{ __html: themeCss() }} />
      <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
    </>
  );
}
