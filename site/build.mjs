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
    if (/^>(?: |$)/.test(line)) { flushParagraph(); flushList(); quote.push(line.slice(1).trim()); continue; }
    const numbered = line.match(/^\d+\.\s+(.*)$/);
    if (numbered) { flushParagraph(); flushQuote(); list.push(numbered[1]); continue; }
    paragraph.push(line.trim());
  }
  flush();
  return output.join("\n");
}

function page({ title, description, body, depth = 0, path = "", image = "preface-hero.png" }) {
  const prefix = depth ? "../".repeat(depth) : "./";
  const canonical = `${baseUrl}/${path}`;
  const chapterLocation = path.match(/^chapters\/(\d{2})\/$/);
  const chineseChapterNumbers = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];
  const location = path === "preface/"
    ? " → 序言"
    : path === "afterword/"
      ? " → 后记"
    : chapterLocation
      ? ` → 第${chineseChapterNumbers[Number(chapterLocation[1]) - 1]}章`
      : "";
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
  <meta property="og:image" content="${baseUrl}/assets/${image}">
  <link rel="canonical" href="${canonical}">
  <link rel="stylesheet" href="${prefix}assets/site.css">
</head>
<body>
  <header class="site-header">
    <div><a href="${prefix}index.html">GPCR 阅读文库</a>${location}</div>
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
await copyFile(join(root, "site", "chapter-one-structure.png"), join(out, "assets", "chapter-one-structure.png"));
await copyFile(join(root, "site", "chapter-one-wechat-portrait-v3.png"), join(out, "assets", "chapter-one-wechat-portrait-v3.png"));
await copyFile(join(root, "site", "chapter-one-wechat-portrait-v3.png"), join(out, "assets", "chapter-one-wechat-portrait.png"));
await copyFile(join(root, "site", "chapter-two-structure-v1.png"), join(out, "assets", "chapter-two-structure-v1.png"));
await copyFile(join(root, "site", "chapter-two-wechat-qrcode-v1.png"), join(out, "assets", "chapter-two-wechat-qrcode-v1.png"));
await copyFile(join(root, "site", "chapter-two-wechat-qrcode-v1.png"), join(out, "assets", "chapter-two-wechat-portrait.png"));
await writeFile(join(out, ".nojekyll"), "");

const prefaceSource = await readFile(join(root, "《贺新郎 读史》新解.md"), "utf8");
const prefaceBody = `<main class="article-shell"><article>
  <header class="article-header"><h1>序言</h1><p class="subtitle">《贺新郎·读史》新解</p><p class="byline">作者：小蜗H快跑　｜　写作辅助：ChatGPT</p></header>
  <figure class="chapter-image preface-image"><img src="../assets/preface-hero.png" alt="劳动的人们穿过历史，走向东方晨光"><figcaption>从历史深处，走向东方白</figcaption></figure>
  <div class="prose">${markdown(prefaceSource)}</div>
  <aside class="forthcoming"><strong>继续阅读：</strong><a href="../chapters/01/index.html">第一章｜人猿相揖别——人是怎样成为人的？</a></aside>
</article></main>`;
await mkdir(join(out, "preface"), { recursive: true });
await writeFile(join(out, "preface", "index.html"), page({
  title: "序言",
  description: "这组文章的写作缘起、问题意识和九章结构。",
  body: prefaceBody,
  depth: 1,
  path: "preface/",
}));

const chapterOneSource = await readFile(join(root, "第一章｜人猿相揖别——人是怎样成为人的.md"), "utf8");
const chapterOneContent = chapterOneSource.split("\n").slice(1).join("\n");
const chapterOneBody = `<main class="article-shell"><article>
  <header class="article-header"><h1>第一章｜人猿相揖别</h1><p class="subtitle">人是怎样成为人的？</p><p class="byline">作者：小蜗H快跑　｜　写作辅助：ChatGPT</p></header>
  <figure class="chapter-image chapter-structure-image"><a class="chapter-image-link" href="../../assets/chapter-one-structure.png"><img src="../../assets/chapter-one-structure.png" alt="第一章内容与架构：从自然前提、劳动、工具和语言走向共同体"></a><figcaption>第一章的主要内容与论证结构　·　<a href="../../assets/chapter-one-structure.png">打开横版大图</a>　·　<a href="../../assets/chapter-one-wechat-portrait-v3.png">下载朋友圈竖版图</a></figcaption></figure>
  <div class="text-edition-heading"><span>正文</span></div>
  <div class="prose marxists-prose">${markdown(chapterOneContent)}</div>
  <aside class="forthcoming"><a href="../../preface/index.html">上一篇：序言</a>　｜　<a href="../02/index.html">下一篇：第二章｜只几个石头磨过</a></aside>
</article></main>`;
await mkdir(join(out, "chapters", "01"), { recursive: true });
await writeFile(join(out, "chapters", "01", "index.html"), page({
  title: "第一章｜人猿相揖别——人是怎样成为人的？",
  description: "人不是历史的现成前提，而是在劳动、工具、语言和共同活动中逐渐成为人的。",
  body: chapterOneBody,
  depth: 2,
  path: "chapters/01/",
  image: "chapter-one-structure.png",
}));

const chapterTwoSource = await readFile(join(root, "第二章｜只几个石头磨过——生产力低下时代的共同体.md"), "utf8");
const chapterTwoContent = chapterTwoSource.split("\n").slice(1).join("\n");
const chapterTwoBody = `<main class="article-shell"><article>
  <header class="article-header"><h1>第二章｜只几个石头磨过</h1><p class="subtitle">生产力低下时代的共同体</p><p class="byline">作者：小蜗H快跑　｜　写作辅助：ChatGPT</p></header>
  <figure class="chapter-image chapter-structure-image"><a class="chapter-image-link" href="../../assets/chapter-two-structure-v1.png"><img src="../../assets/chapter-two-structure-v1.png" alt="第二章内容与论证结构：生存条件、共同劳动、共同占有、氏族组织与公共事务"></a><figcaption>第二章的主要内容与论证结构　·　<a href="../../assets/chapter-two-structure-v1.png">打开横版大图</a>　·　<a href="../../assets/chapter-two-wechat-qrcode-v1.png">下载朋友圈竖版图</a></figcaption></figure>
  <div class="text-edition-heading"><span>正文</span></div>
  <div class="prose marxists-prose">${markdown(chapterTwoContent)}</div>
  <aside class="forthcoming"><a href="../01/index.html">上一篇：第一章｜人猿相揖别</a>　｜　<a href="../03/index.html">下一篇：第三章｜铜铁炉中翻火焰</a></aside>
</article></main>`;
await mkdir(join(out, "chapters", "02"), { recursive: true });
await writeFile(join(out, "chapters", "02", "index.html"), page({
  title: "第二章｜只几个石头磨过——生产力低下时代的共同体",
  description: "共同体最初不是自由选择，也不是道德理想，而是生产力低下条件下的生存形式。",
  body: chapterTwoBody,
  depth: 2,
  path: "chapters/02/",
  image: "chapter-two-structure-v1.png",
}));

const laterChapters = [
  ["03", "三", "第三章｜铜铁炉中翻火焰——生产力怎样撕开共同体.md", "铜铁炉中翻火焰", "生产力怎样撕开共同体"],
  ["04", "四", "第四章｜不过几千寒热——财产怎样进入家庭.md", "不过几千寒热", "财产怎样进入家庭"],
  ["05", "五", "第五章｜人世难逢开口笑——私有制怎样创造阶级.md", "人世难逢开口笑", "私有制怎样创造阶级"],
  ["06", "六", "第六章｜上疆场彼此弯弓月——阶级矛盾与国家的诞生.md", "上疆场彼此弯弓月", "阶级矛盾与国家的诞生"],
  ["07", "七", "第七章｜流遍了，郊原血——文明究竟意味着什么.md", "流遍了，郊原血", "文明究竟意味着什么"],
  ["08", "八", "第八章｜五帝三皇神圣事——究竟是谁创造了历史.md", "五帝三皇神圣事", "究竟是谁创造了历史"],
  ["09", "九", "第九章｜歌未竟，东方白——家庭、私有制和国家会走向哪里.md", "歌未竟，东方白", "家庭、私有制和国家会走向哪里"],
];

for (const [slug, numberName, file, poeticTitle, subtitle] of laterChapters) {
  const source = await readFile(join(root, file), "utf8");
  const content = source.split("\n").slice(1).join("\n");
  const index = Number(slug) - 1;
  const previous = index === 2 ? ["02", "二", "只几个石头磨过"] : laterChapters[index - 3];
  const next = laterChapters[index - 1];
  const navigation = `<aside class="forthcoming"><a href="../${previous[0]}/index.html">上一篇：第${previous[1]}章｜${previous[3] ?? previous[2]}</a>${next ? `　｜　<a href="../${next[0]}/index.html">下一篇：第${next[1]}章｜${next[3]}</a>` : `　｜　<a href="../../afterword/index.html">下一篇：后记｜当坚冰还盖着北海的时候，我看到了怒放的梅花</a>`}</aside>`;
  const body = `<main class="article-shell"><article>
  <header class="article-header"><h1>第${numberName}章｜${poeticTitle}</h1><p class="subtitle">${subtitle}</p><p class="byline">作者：小蜗H快跑　｜　写作辅助：ChatGPT</p></header>
  <div class="text-edition-heading"><span>正文</span></div>
  <div class="prose marxists-prose">${markdown(content)}</div>
  ${navigation}
</article></main>`;
  const firstParagraph = content.split(/\n\s*\n/).find((part) => part.trim() && !part.trim().startsWith(">"))?.replace(/[#>*_`]/g, "").replace(/<br>/g, " ").trim() ?? subtitle;
  const dir = join(out, "chapters", slug);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "index.html"), page({
    title: `第${numberName}章｜${poeticTitle}——${subtitle}`,
    description: firstParagraph.slice(0, 150),
    body,
    depth: 2,
    path: `chapters/${slug}/`,
  }));
}

const afterwordSource = await readFile(join(root, "后记｜当坚冰还盖着北海的时候，我看到了怒放的梅花.md"), "utf8");
const afterwordContent = afterwordSource.split("\n").slice(1).join("\n");
const afterwordBody = `<main class="article-shell"><article>
  <header class="article-header"><h1>后记</h1><p class="subtitle">当坚冰还盖着北海的时候，我看到了怒放的梅花</p><p class="byline">作者：小蜗H快跑　｜　写作辅助：ChatGPT</p></header>
  <div class="text-edition-heading"><span>正文</span></div>
  <div class="prose marxists-prose">${markdown(afterwordContent)}</div>
  <aside class="forthcoming"><a href="../chapters/09/index.html">上一篇：第九章｜歌未竟，东方白</a></aside>
</article></main>`;
await mkdir(join(out, "afterword"), { recursive: true });
await writeFile(join(out, "afterword", "index.html"), page({
  title: "后记｜当坚冰还盖着北海的时候，我看到了怒放的梅花",
  description: "《家庭、私有制和国家的起源》五年重读后记：从批判既有秩序，到在矛盾中缓慢而坚定地前进。",
  body: afterwordBody,
  depth: 1,
  path: "afterword/",
}));

const indexBody = `<main>
  <section class="archive-home">
    <header class="article-header"><h1>《贺新郎·读史》新解</h1><p class="byline">作者：小蜗H快跑　｜　写作辅助：ChatGPT</p></header>
    <div class="introduction">
      <p>文章围绕《家庭、私有制和国家的起源》与《贺新郎·读史》展开。从“人猿相揖别”到“歌未竟，东方白”，讨论劳动、共同体、家庭、私有制、阶级、国家与人的解放。</p>
      <p>这些文章从制度怎样产生、怎样取得历史根据、又怎样显露自身界限的问题出发。文章以经典原著和历史过程为主要线索，序言与九章现已全部发布。</p>
    </div>
    <h2>目录</h2>
    <ul class="archive-list">
      <li><span class="entry-number">序言</span><a href="preface/index.html">《贺新郎·读史》新解的写作缘起与问题意识</a><span class="status published">已发布</span></li>
      <li><span class="entry-number">第一章</span><a href="chapters/01/index.html">人猿相揖别——人是怎样成为人的</a><span class="status published">已发布</span></li>
      <li><span class="entry-number">第二章</span><a href="chapters/02/index.html">只几个石头磨过——生产力低下时代的共同体</a><span class="status published">已发布</span></li>
      <li><span class="entry-number">第三章</span><a href="chapters/03/index.html">铜铁炉中翻火焰——生产力怎样撕开共同体</a><span class="status published">已发布</span></li>
      <li><span class="entry-number">第四章</span><a href="chapters/04/index.html">不过几千寒热——财产怎样进入家庭</a><span class="status published">已发布</span></li>
      <li><span class="entry-number">第五章</span><a href="chapters/05/index.html">人世难逢开口笑——私有制怎样创造阶级</a><span class="status published">已发布</span></li>
      <li><span class="entry-number">第六章</span><a href="chapters/06/index.html">上疆场彼此弯弓月——阶级矛盾与国家的诞生</a><span class="status published">已发布</span></li>
      <li><span class="entry-number">第七章</span><a href="chapters/07/index.html">流遍了，郊原血——文明究竟意味着什么</a><span class="status published">已发布</span></li>
      <li><span class="entry-number">第八章</span><a href="chapters/08/index.html">五帝三皇神圣事——究竟是谁创造了历史</a><span class="status published">已发布</span></li>
      <li><span class="entry-number">第九章</span><a href="chapters/09/index.html">歌未竟，东方白——家庭、私有制和国家会走向哪里</a><span class="status published">已发布</span></li>
      <li><span class="entry-number">后记</span><a href="afterword/index.html">当坚冰还盖着北海的时候，我看到了怒放的梅花</a><span class="status published">已发布</span></li>
    </ul>
  </section>
</main>`;

await writeFile(join(out, "index.html"), page({ title: "首页", description: "《贺新郎·读史》新解：一组关于劳动、家庭、私有制、阶级、国家与人的解放的文章。", body: indexBody }));
await writeFile(join(out, "404.html"), page({ title: "页面未找到", description: "页面未找到", body: '<main class="not-found"><p class="eyebrow">404</p><h1>这一页尚未写入历史</h1><a class="button" href="./index.html">返回首页</a></main>' }));
await writeFile(join(out, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`);
await writeFile(join(out, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${baseUrl}/</loc></url><url><loc>${baseUrl}/preface/</loc></url>${Array.from({ length: 9 }, (_, index) => `<url><loc>${baseUrl}/chapters/${String(index + 1).padStart(2, "0")}/</loc></url>`).join("")}<url><loc>${baseUrl}/afterword/</loc></url></urlset>`);
console.log(`Built the preface, nine chapters, and afterword in ${out}`);
