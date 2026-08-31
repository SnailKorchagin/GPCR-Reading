import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "docs");
const baseUrl = "https://snailkorchagin.github.io/GPCR-Reading";

const escapeHtml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

function inline(value) {
  return escapeHtml(value)
    .replaceAll("&lt;br&gt;", "<br>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" rel="noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function markdown(source) {
  const lines = source.replace(/\r/g, "").split("\n");
  const output = [];
  let paragraph = [];
  let quote = [];
  let list = [];

  const flushParagraph = () => {
    if (paragraph.length) output.push(`<p>${inline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushQuote = () => {
    if (quote.length) output.push(`<blockquote><p>${inline(quote.join("<br>"))}</p></blockquote>`);
    quote = [];
  };
  const flushList = () => {
    if (list.length) output.push(`<ol>${list.map((item) => `<li>${inline(item)}</li>`).join("")}</ol>`);
    list = [];
  };
  const flush = () => { flushParagraph(); flushQuote(); flushList(); };

  for (const line of lines) {
    if (!line.trim()) { flush(); continue; }
    if (line.startsWith("# ")) continue;
    if (/^#{2,4} /.test(line)) {
      flush();
      const level = line.match(/^#+/)[0].length;
      const text = line.slice(level + 1);
      const id = `section-${output.filter((item) => item.startsWith("<h")).length + 1}`;
      output.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      continue;
    }
    if (line.trim() === "---") { flush(); output.push("<hr>"); continue; }
    if (line.startsWith("> ")) { flushParagraph(); flushList(); quote.push(line.slice(2).trim()); continue; }
    const numbered = line.match(/^\d+\.\s+(.*)$/);
    if (numbered) { flushParagraph(); flushQuote(); list.push(numbered[1]); continue; }
    paragraph.push(line.trim());
  }
  flush();
  return output.join("\n");
}

function page({ title, description, body, depth = 0, path = "" }) {
  const prefix = depth ? "../".repeat(depth) : "./";
  const canonical = `${baseUrl}/${path}`;
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}｜《贺新郎·读史》新解</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="author" content="小蜗H快跑">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${baseUrl}/assets/preface-hero.png">
  <link rel="canonical" href="${canonical}">
  <link rel="stylesheet" href="${prefix}assets/site.css">
</head>
<body>
  <header class="site-header">
    <a class="brand" href="${prefix}index.html"><span>GPCR · Great Proletarian Cultural Revolution</span><b>歌未竟，东方白</b></a>
    <a class="github" href="https://github.com/SnailKorchagin/GPCR-Reading">GitHub</a>
  </header>
  ${body}
  <footer><p>个人原创写作 · 作者 小蜗H快跑</p><p>转载请注明作者及原文链接</p></footer>
</body>
</html>`;
}

await rm(out, { recursive: true, force: true });
await mkdir(join(out, "assets"), { recursive: true });
await copyFile(join(root, "site", "site.css"), join(out, "assets", "site.css"));
await copyFile(join(root, "site", "preface-hero.png"), join(out, "assets", "preface-hero.png"));
await writeFile(join(out, ".nojekyll"), "");

const prefaceSource = await readFile(join(root, "《贺新郎 读史》新解.md"), "utf8");
const prefaceBody = `<main class="article-shell"><article>
  <header class="article-header"><p class="eyebrow">序言 · 首发</p><h1>为什么写这九章</h1><p class="subtitle">《贺新郎·读史》新解</p><p class="byline">作者 · 小蜗H快跑</p></header>
  <figure class="chapter-image preface-image"><img src="../assets/preface-hero.png" alt="劳动的人们穿过历史，走向东方晨光"><figcaption>从历史深处，走向东方白</figcaption></figure>
  <div class="prose">${markdown(prefaceSource)}</div>
  <aside class="forthcoming"><p class="eyebrow">九章连载</p><h2>正文将陆续发布</h2><p>序言先行。第一章《人猿相揖别》及后续篇章完成公开校订后，将在这里继续更新。</p></aside>
</article></main>`;
await mkdir(join(out, "preface"), { recursive: true });
await writeFile(join(out, "preface", "index.html"), page({
  title: "序言——为什么写这九章",
  description: "这组原创文章的写作缘起、问题意识和九章结构。",
  body: prefaceBody,
  depth: 1,
  path: "preface/",
}));

const indexBody = `<main>
  <section class="hero">
    <div class="hero-copy"><p class="eyebrow">序言首发 · 作者 小蜗H快跑</p><h1>《贺新郎·读史》新解</h1><p class="lead">从“人猿相揖别”到“歌未竟，东方白”：从经典原著出发，讨论劳动、共同体、家庭、私有制、阶级、国家与人的解放。</p><div class="hero-actions"><a class="button" href="preface/index.html">阅读序言</a><span class="serial-note">九章正文 · 陆续发布</span></div></div>
    <figure class="hero-art"><img src="assets/preface-hero.png" alt="劳动的人们穿过历史，走向东方晨光"><figcaption>序言 · 为什么写这九章</figcaption></figure>
  </section>
  <section class="statement"><p>这不是转载或资料汇编，而是小蜗H快跑围绕《家庭、私有制和国家的起源》与《贺新郎·读史》写作的一组原创阅读注解。现在先发布序言，正文九章将陆续公开。 <a href="preface/index.html">阅读序言 →</a></p></section>
  <section class="arc"><p>人的形成</p><span>→</span><p>原始共同体</p><span>→</span><p>生产力与剩余</p><span>→</span><p>家庭与财产</p><span>→</span><p>私有制与阶级</p><span>→</span><p>国家与文明</p><span>→</span><p>历史主体与未来</p></section>
</main>`;

await writeFile(join(out, "index.html"), page({ title: "首页", description: "《贺新郎·读史》新解：一组关于劳动、家庭、私有制、阶级、国家与人的解放的原创文章。", body: indexBody }));
await writeFile(join(out, "404.html"), page({ title: "页面未找到", description: "页面未找到", body: '<main class="not-found"><p class="eyebrow">404</p><h1>这一页尚未写入历史</h1><a class="button" href="./index.html">返回首页</a></main>' }));
await writeFile(join(out, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`);
await writeFile(join(out, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${baseUrl}/</loc></url><url><loc>${baseUrl}/preface/</loc></url></urlset>`);
console.log(`Built the preface release in ${out}`);
