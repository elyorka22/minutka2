/**
 * Minimal above-the-fold paint (FCP) before the full globals.css chunk applies.
 * Duplicates key tokens from globals.css — keep in sync when changing design tokens.
 */
export function CriticalCss() {
  const css = `
:root{--color-bg:#fafafa;--color-surface:#ffffff;--color-border:#e5e7eb;--color-text:#111827}
html,body{margin:0;padding:0;width:100%;max-width:100%;overflow-x:hidden}
body.fd-body{min-height:100vh;background:var(--color-bg);color:var(--color-text);font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased}
.fd-shell{max-width:1100px;width:100%;margin:0 auto}
.fd-main{padding:24px 20px 140px;box-sizing:border-box}
.fd-header{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:14px 24px;min-height:52px;box-sizing:border-box;background:var(--color-surface);border-bottom:1px solid var(--color-border)}
.fd-home-top{padding-top:8px;display:flex;flex-direction:column;gap:16px}
.fd-home-search-input{width:100%;min-height:44px;box-sizing:border-box;border-radius:12px;border:1px solid var(--color-border);background:var(--color-surface);padding:10px 12px;font-size:0.9rem}
`.replace(/\s+/g, " ");

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
