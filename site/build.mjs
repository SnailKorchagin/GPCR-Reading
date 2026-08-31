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
    <div><a href="${prefix}index.html">GPCR 阅读文库</a>${path === "preface/" ? " → 序言" : ""}</div>
    <a href="https://github.com/SnailKorchagin/GPCR-Reading">GitHub</a>
  </header>
  <hr class="site-rule">
  ${body}
  <footer><hr><p>GPCR 阅读文库</p></footer>
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
  <header class="article-header"><h1>序言</h1><p class="subtitle">《贺新郎·读史》新解</p><p class="byline">作者：小蜗H快跑　｜　写作辅助：ChatGPT</p></header>
  <figure class="chapter-image preface-image"><img src="../assets/preface-hero.png" alt="劳动的人们穿过历史，走向东方晨光"><figcaption>从历史深处，走向东方白</figcaption></figure>
  <div class="prose">${markdown(prefaceSource)}</div>
  <aside class="forthcoming"><strong>说明：</strong>九章正文完成公开校订后，将在这里陆续更新。</aside>
</article></main>`;
await mkdir(join(out, "preface"), { recursive: true });
await writeFile(join(out, "preface", "index.html"), page({
  title: "序言",
  description: "这组文章的写作缘起、问题意识和九章结构。",
  body: prefaceBody,
  depth: 1,
  path: "preface/",
}));

const indexBody = `<main>
  <section class="archive-home">
    <header class="article-header"><h1>《贺新郎·读史》新解</h1><p class="byline">作者：小蜗H快跑　｜　写作辅助：ChatGPT</p></header>
    <div class="introduction">
      <p>文章围绕《家庭、私有制和国家的起源》与《贺新郎·读史》展开。从“人猿相揖别”到“歌未竟，东方白”，讨论劳动、共同体、家庭、私有制、阶级、国家与人的解放。</p>
      <p>这些文章从制度怎样产生、怎样取得历史根据、又怎样显露自身界限的问题出发。文章以经典原著和历史过程为主要线索，序言已经发布，九章正文将在校订后陆续更新。</p>
    </div>
    <h2>目录</h2>
    <ul class="archive-list">
      <li><span class="entry-number">序言</span><a href="preface/index.html">《贺新郎·读史》新解的写作缘起与问题意识</a><span class="status published">已发布</span></li>
      <li><span class="entry-number">第一章</span><span class="entry-title">人猿相揖别——人是怎样成为人的</span><span class="status">待发布</span></li>
      <li><span class="entry-number">第二章</span><span class="entry-title">只几个石头磨过——生产力低下时代的共同体</span><span class="status">待发布</span></li>
      <li><span class="entry-number">第三章</span><span class="entry-title">铜铁炉中翻火焰——生产力怎样撕开共同体</span><span class="status">待发布</span></li>
      <li><span class="entry-number">第四章</span><span class="entry-title">不过几千寒热——财产怎样进入家庭</span><span class="status">待发布</span></li>
      <li><span class="entry-number">第五章</span><span class="entry-title">人世难逢开口笑——私有制怎样创造阶级</span><span class="status">待发布</span></li>
      <li><span class="entry-number">第六章</span><span class="entry-title">上疆场彼此弯弓月——阶级矛盾与国家的诞生</span><span class="status">待发布</span></li>
      <li><span class="entry-number">第七章</span><span class="entry-title">流遍了，郊原血——文明究竟意味着什么</span><span class="status">待发布</span></li>
      <li><span class="entry-number">第八章</span><span class="entry-title">五帝三皇神圣事——究竟是谁创造了历史</span><span class="status">待发布</span></li>
      <li><span class="entry-number">第九章</span><span class="entry-title">歌未竟，东方白——家庭、私有制和国家会走向哪里</span><span class="status">待发布</span></li>
    </ul>
  </section>
</main>`;

await writeFile(join(out, "index.html"), page({ title: "首页", description: "《贺新郎·读史》新解：一组关于劳动、家庭、私有制、阶级、国家与人的解放的文章。", body: indexBody }));
await writeFile(join(out, "404.html"), page({ title: "页面未找到", description: "页面未找到", body: '<main class="not-found"><p class="eyebrow">404</p><h1>这一页尚未写入历史</h1><a class="button" href="./index.html">返回首页</a></main>' }));
await writeFile(join(out, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`);
await writeFile(join(out, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${baseUrl}/</loc></url><url><loc>${baseUrl}/preface/</loc></url></urlset>`);
console.log(`Built the preface release in ${out}`);
