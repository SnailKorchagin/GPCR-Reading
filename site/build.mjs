import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "docs");
const baseUrl = "https://snailkorchagin.github.io/GPCR-Reading";

const chapters = [
  ["01", "第一章｜人猿相揖别——人是怎样成为人的.md", "人猿相揖别", "人是怎样成为人的？"],
  ["02", "第二章｜只几个石头磨过——生产力低下时代的共同体.md", "只几个石头磨过", "生产力低下时代的共同体"],
  ["03", "第三章｜铜铁炉中翻火焰——生产力怎样撕开共同体.md", "铜铁炉中翻火焰", "生产力怎样撕开共同体"],
  ["04", "第四章｜不过几千寒热——财产怎样进入家庭.md", "不过几千寒热", "财产怎样进入家庭"],
  ["05", "第五章｜人世难逢开口笑——私有制怎样创造阶级.md", "人世难逢开口笑", "私有制怎样创造阶级"],
  ["06", "第六章｜上疆场彼此弯弓月——阶级矛盾与国家的诞生.md", "上疆场彼此弯弓月", "阶级矛盾与国家的诞生"],
  ["07", "第七章｜流遍了，郊原血——文明究竟意味着什么.md", "流遍了，郊原血", "文明究竟意味着什么"],
  ["08", "第八章｜五帝三皇神圣事——究竟是谁创造了历史.md", "五帝三皇神圣事", "究竟是谁创造了历史"],
  ["09", "第九章｜歌未竟，东方白——家庭、私有制和国家会走向哪里.md", "歌未竟，东方白", "家庭、私有制和国家会走向哪里"],
];

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

function page({ title, description, body, depth = 0, chapter = null, path = "" }) {
  const prefix = depth ? "../".repeat(depth) : "./";
  const canonical = chapter ? `${baseUrl}/chapters/${chapter}/` : `${baseUrl}/${path}`;
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}｜《贺新郎·读史》新解</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="author" content="SnailKorchagin">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${baseUrl}/assets/chapter-one.png">
  <link rel="canonical" href="${canonical}">
  <link rel="stylesheet" href="${prefix}assets/site.css">
</head>
<body>
  <header class="site-header">
    <a class="brand" href="${prefix}index.html"><span>GPCR · Great Proletarian Cultural Revolution</span><b>歌未竟，东方白</b></a>
    <a class="github" href="https://github.com/SnailKorchagin/GPCR-Reading">GitHub</a>
  </header>
  ${body}
  <footer><p>个人原创写作 · 作者 SnailKorchagin</p><p>转载请注明作者及原文链接</p></footer>
</body>
</html>`;
}

await rm(out, { recursive: true, force: true });
await mkdir(join(out, "assets"), { recursive: true });
await copyFile(join(root, "site", "site.css"), join(out, "assets", "site.css"));
await copyFile(join(root, "Pasted image 20260819201125.png"), join(out, "assets", "chapter-one.png"));
await writeFile(join(out, ".nojekyll"), "");

const prefaceSource = await readFile(join(root, "《贺新郎 读史》新解.md"), "utf8");
const prefaceBody = `<main class="article-shell"><article>
  <header class="article-header"><p class="eyebrow">序言 · 写在前面</p><h1>为什么写这九章</h1><p class="subtitle">《贺新郎·读史》新解</p><p class="byline">作者 · SnailKorchagin</p></header>
  <div class="prose">${markdown(prefaceSource)}</div>
  <nav class="chapter-nav"><span></span><a class="next" href="../chapters/01/index.html"><span>进入正文</span>第一章 · 人猿相揖别</a></nav>
</article></main>`;
await mkdir(join(out, "preface"), { recursive: true });
await writeFile(join(out, "preface", "index.html"), page({
  title: "序言——为什么写这九章",
  description: "这组原创文章的写作缘起、问题意识和九章结构。",
  body: prefaceBody,
  depth: 1,
  path: "preface/",
}));

const chapterData = [];
for (const [slug, file, poetic, question] of chapters) {
  const source = await readFile(join(root, file), "utf8");
  const bodySource = source.split("\n").slice(1).join("\n");
  const firstParagraph = bodySource.split(/\n\s*\n/).find((part) => part.trim() && !part.trim().startsWith(">"))?.replace(/[#>*_`]/g, "").replace(/<br>/g, " ").trim() ?? question;
  chapterData.push({ slug, poetic, question, description: firstParagraph.slice(0, 105) });
  const index = Number(slug) - 1;
  const previous = chapters[index - 1];
  const next = chapters[index + 1];
  const nav = `<nav class="chapter-nav">
    ${previous ? `<a href="../${previous[0]}/index.html"><span>上一篇</span>${previous[2]}</a>` : "<span></span>"}
    ${next ? `<a class="next" href="../${next[0]}/index.html"><span>下一篇</span>${next[2]}</a>` : "<span></span>"}
  </nav>`;
  const heroImage = slug === "01" ? `<figure class="chapter-image"><img src="../../assets/chapter-one.png" alt="第一章：劳动、工具与人的形成"></figure>` : "";
  const content = `<main class="article-shell">
    <article>
      <header class="article-header"><p class="eyebrow">第 ${String(Number(slug)).padStart(2, "0")} 章 · 九章连载</p><h1>${poetic}</h1><p class="subtitle">${question}</p><p class="byline">作者 · SnailKorchagin</p></header>
      ${heroImage}
      <div class="prose">${markdown(bodySource)}</div>
      ${nav}
    </article>
  </main>`;
  const dir = join(out, "chapters", slug);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "index.html"), page({ title: `${poetic}——${question}`, description: firstParagraph.slice(0, 150), body: content, depth: 2, chapter: slug }));
}

const cards = chapterData.map(({ slug, poetic, question, description }) => `<a class="chapter-card" href="chapters/${slug}/index.html">
  <span class="chapter-number">${slug}</span><div><h2>${poetic}</h2><p class="card-question">${question}</p><p>${escapeHtml(description)}…</p></div><span class="arrow">→</span>
</a>`).join("\n");

const indexBody = `<main>
  <section class="hero">
    <div class="hero-copy"><p class="eyebrow">GPCR · Great Proletarian Cultural Revolution</p><h1>《贺新郎·读史》新解</h1><p class="lead">从“人猿相揖别”到“歌未竟，东方白”：从经典原著出发，讨论劳动、共同体、家庭、私有制、阶级、国家与人的解放。</p><div class="hero-actions"><a class="button" href="chapters/01/index.html">从第一章开始</a><a class="text-link" href="#contents">查看九章目录 ↓</a></div></div>
    <figure class="hero-art"><img src="assets/chapter-one.png" alt="劳动、工具与人的形成"><figcaption>第一章 · 人猿相揖别</figcaption></figure>
  </section>
  <section class="statement"><p>这不是转载或资料汇编，而是作者围绕《家庭、私有制和国家的起源》与《贺新郎·读史》写作的一组阅读注解。网站用于保留完整篇幅、经典引文、原文出处与章节之间的历史联系。 <a href="preface/index.html">阅读序言 →</a></p></section>
  <section class="contents" id="contents"><div class="section-heading"><p class="eyebrow">CONTENTS</p><h2>九章，一次连续的历史运动</h2></div><div class="chapter-list">${cards}</div></section>
  <section class="arc"><p>人的形成</p><span>→</span><p>原始共同体</p><span>→</span><p>生产力与剩余</p><span>→</span><p>家庭与财产</p><span>→</span><p>私有制与阶级</p><span>→</span><p>国家与文明</p><span>→</span><p>历史主体与未来</p></section>
</main>`;

await writeFile(join(out, "index.html"), page({ title: "首页", description: "《贺新郎·读史》新解：一组关于劳动、家庭、私有制、阶级、国家与人的解放的原创文章。", body: indexBody }));
await writeFile(join(out, "404.html"), page({ title: "页面未找到", description: "页面未找到", body: '<main class="not-found"><p class="eyebrow">404</p><h1>这一页尚未写入历史</h1><a class="button" href="./index.html">返回九章目录</a></main>' }));
await writeFile(join(out, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`);
await writeFile(join(out, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${baseUrl}/</loc></url><url><loc>${baseUrl}/preface/</loc></url>${chapters.map(([slug]) => `<url><loc>${baseUrl}/chapters/${slug}/</loc></url>`).join("")}</urlset>`);
console.log(`Built ${chapters.length + 1} pages in ${out}`);
