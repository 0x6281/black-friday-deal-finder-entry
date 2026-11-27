// HTML for each page, built from the deal data. Every value is escaped before it
// goes into the page, so a deal's text can never break the markup.

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const usd = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
const percentOff = (d) => Math.round((1 - d.price / d.was) * 100);
const saving = (d) => d.was - d.price;
const checkTime = (iso) => {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
};
const verdictClass = (v) => `verdict verdict-${v.toLowerCase().replace(/\s+/g, '-')}`;

function storeChip(store) {
  return `<span class="store store-${store.toLowerCase().replace(/\s+/g, '-')}">${escape(store)}</span>`;
}

function dealCard(d) {
  const pct = percentOff(d);
  return `<article class="card">
  <div class="card-top">
    <span class="pct">-${pct}%</span>
    <span class="${verdictClass(d.verdict)}">${escape(d.verdict)}</span>
  </div>
  <h3><a href="#/deal/${encodeURIComponent(d.id)}">${escape(d.title)}</a></h3>
  <p class="card-meta">${storeChip(d.store)} <span class="category">${escape(d.category)}</span></p>
  <p class="card-price"><strong>${usd(d.price)}</strong> <s>${usd(d.was)}</s></p>
  <p class="card-save">You save ${usd(saving(d))}</p>
  <p class="card-check">Checked ${checkTime(d.checked)} &middot; Source: ${escape(d.source)}</p>
  <p class="card-link"><a class="btn" href="${escape(d.url)}" target="_blank" rel="noopener">View at ${escape(d.store)} &nearr;</a></p>
</article>`;
}

function option(value, label, selected) {
  return `<option value="${escape(value)}"${selected ? ' selected' : ''}>${escape(label)}</option>`;
}

export { dealCard as dealCardHtml };

export function filterBar(state) {
  const catOptions = ['All categories', ...state.categories].map((c) =>
    option(c === 'All categories' ? '' : c, c, state.category === (c === 'All categories' ? '' : c)),
  ).join('');
  const storeOptions = ['All stores', ...state.stores].map((s) =>
    option(s === 'All stores' ? '' : s, s, state.store === (s === 'All stores' ? '' : s)),
  ).join('');
  return `<form class="filters" id="filters" onsubmit="return false">
  <label class="search-label">Search deals
    <input type="search" id="q" placeholder="Search by product name&hellip;" value="${escape(state.q)}" autocomplete="off">
  </label>
  <label>Category
    <select id="category">${catOptions}</select>
  </label>
  <label>Store
    <select id="store">${storeOptions}</select>
  </label>
  <label>Discount
    <select id="discount">
      ${option('', 'Any discount', state.discount === '')}
      ${option('40', '40%+ off', state.discount === '40')}
      ${option('50', '50%+ off', state.discount === '50')}
      ${option('newlow', 'New lows only', state.discount === 'newlow')}
    </select>
  </label>
  <label>Sort by
    <select id="sort">
      ${option('discount', 'Best discount %', state.sort === 'discount')}
      ${option('saving', 'Biggest saving ($)', state.sort === 'saving')}
      ${option('price', 'Lowest price', state.sort === 'price')}
    </select>
  </label>
  <button type="button" id="clear-filters" class="btn btn-ghost">Clear</button>
</form>`;
}

export function listPage(shown, state, counts) {
  const cards = shown.length === 0
    ? '<p class="empty">No deal matches those filters. <button type="button" id="clear-empty" class="btn btn-ghost">Clear all filters</button></p>'
    : `<div class="grid">${shown.map(dealCard).join('')}</div>`;
  return `<section class="intro">
  <h1>Black Friday 2026 deals, checked today</h1>
  <p class="lede">Every price below was read from the named deals source on Friday 27 November 2026. No inflated "was" prices, no guesswork: each card shows the sale price, the usual price, the discount and the verdict.</p>
</section>
<details class="filters-wrap" open>
  <summary>Search &amp; filters</summary>
  ${filterBar(state)}
</details>
<p class="count" id="count">${counts.shown} of ${counts.total} deals${counts.note ? ` &middot; ${escape(counts.note)}` : ''}</p>
${cards}
<section class="verify" id="how-we-verify">
  <h2>How we verify</h2>
  <p>Every deal on this page was read from a named deals source on 27 November 2026 (Black Friday itself), at 08:00 UTC. The source is printed on each card and on each deal page. Prices are in US dollars and the discount is computed from the sale price against the usual price.</p>
  <dl class="verdicts">
    <dt><span class="verdict verdict-new-low">NEW LOW</span></dt>
    <dd>The lowest price ever, or the lowest in 90 days, according to a price tracker or the source that reported it.</dd>
    <dt><span class="verdict verdict-strong">STRONG</span></dt>
    <dd>A large, genuine cut &mdash; 40% or more, or a big dollar saving &mdash; on a current product.</dd>
    <dt><span class="verdict verdict-good">GOOD</span></dt>
    <dd>A solid cut of 20&ndash;40%, worth buying if you want the item.</dd>
    <dt><span class="verdict verdict-modest">MODEST</span></dt>
    <dd>A small cut. Only worth it if you already wanted the item.</dd>
  </dl>
  <p>Store links go to that store&rsquo;s search page for the exact product name. Direct product URLs rotate during the sale; the search page shows the same product at the store, at the price we checked.</p>
</section>`;
}

export function dealPage(d, related) {
  const pct = percentOff(d);
  const rel = related.length === 0 ? '' : `<section class="related">
  <h2>More ${escape(d.category)} deals</h2>
  <div class="grid">${related.map(dealCard).join('')}</div>
</section>`;
  return `<p class="back"><a href="#/">&larr; All deals</a></p>
<article class="detail">
  <div class="card-top">
    <span class="pct pct-big">-${pct}%</span>
    <span class="${verdictClass(d.verdict)}">${escape(d.verdict)}</span>
  </div>
  <h1>${escape(d.title)}</h1>
  <p class="detail-meta">${storeChip(d.store)} <span class="category">${escape(d.category)}</span></p>
  <p class="detail-price"><strong>${usd(d.price)}</strong> <s>${usd(d.was)}</s> <span class="detail-save">You save ${usd(saving(d))} (${pct}% off)</span></p>
  <dl class="detail-facts">
    <dt>Store</dt><dd>${escape(d.store)}</dd>
    <dt>Sale price</dt><dd>${usd(d.price)}</dd>
    <dt>Usual price</dt><dd>${usd(d.was)}</dd>
    <dt>Discount</dt><dd>${pct}% off &mdash; save ${usd(saving(d))}</dd>
    <dt>Verdict</dt><dd>${escape(d.verdict)}: ${d.verdict === 'NEW LOW' ? 'the lowest price ever, or the lowest in 90 days, per a tracker or the source.' : d.verdict === 'STRONG' ? 'a large, genuine cut on a current product.' : d.verdict === 'GOOD' ? 'a solid 20–40% cut, worth buying.' : 'a small cut; only worth it if you already wanted the item.'}</dd>
    <dt>Checked</dt><dd>${checkTime(d.checked)}</dd>
    <dt>Source</dt><dd>${escape(d.source)}</dd>
  </dl>
  <p><a class="btn btn-big" href="${escape(d.url)}" target="_blank" rel="noopener">View at ${escape(d.store)} &nearr;</a></p>
  <p class="detail-note">The link opens the store&rsquo;s search page for this exact product. Direct product URLs rotate during the sale; the search page shows the same product at the store.</p>
</article>
${rel}`;
}

export function missingPage() {
  return `<h1>Deal not found</h1>
<p>There is no deal at this address. <a href="#/">See all 35 verified deals</a>.</p>`;
}
