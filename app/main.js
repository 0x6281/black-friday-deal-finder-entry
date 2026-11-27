// Deal Beacon: a working deal finder. The deals live in data.js, so the site needs
// no network to show them; each deal links out to its store.
//
//   #/                          the deal list, with search and filters
//   #/?q=…&category=…&store=…&discount=…&sort=…   the list, pre-filtered
//   #/deal/<id>                 one deal, with its source and check time
//
// window.__shotReady is false while a page renders and true once it is on screen,
// so a screenshot script knows when to capture.

import { deals, categories, stores } from './data.js';
import { listPage, dealPage, missingPage, dealCardHtml } from './views.js';

const app = document.getElementById('app');
const TOTAL = deals.length;

const percentOff = (d) => Math.round((1 - d.price / d.was) * 100);
const saving = (d) => d.was - d.price;

function readState() {
  const hash = location.hash.replace(/^#\/?/, '');
  const query = hash.startsWith('?') ? hash.slice(1) : '';
  const params = new URLSearchParams(query);
  const category = params.get('category') ?? '';
  const store = params.get('store') ?? '';
  const discount = params.get('discount') ?? '';
  const sort = params.get('sort') ?? 'discount';
  return {
    q: params.get('q') ?? '',
    category: categories.includes(category) ? category : '',
    store: stores.includes(store) ? store : '',
    discount: ['40', '50', 'newlow'].includes(discount) ? discount : '',
    sort: ['discount', 'saving', 'price'].includes(sort) ? sort : 'discount',
    categories,
    stores,
  };
}

function writeState(state) {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.category) params.set('category', state.category);
  if (state.store) params.set('store', state.store);
  if (state.discount) params.set('discount', state.discount);
  if (state.sort !== 'discount') params.set('sort', state.sort);
  const query = params.toString();
  history.replaceState(null, '', `#/${query ? `?${query}` : ''}`);
}

function applyFilters(state) {
  const q = state.q.trim().toLowerCase();
  let shown = deals.filter((d) => {
    if (q && !`${d.title} ${d.store} ${d.category}`.toLowerCase().includes(q)) return false;
    if (state.category && d.category !== state.category) return false;
    if (state.store && d.store !== state.store) return false;
    if (state.discount === '40' && percentOff(d) < 40) return false;
    if (state.discount === '50' && percentOff(d) < 50) return false;
    if (state.discount === 'newlow' && d.verdict !== 'NEW LOW') return false;
    return true;
  });
  if (state.sort === 'saving') shown = [...shown].sort((a, b) => saving(b) - saving(a) || percentOff(b) - percentOff(a));
  else if (state.sort === 'price') shown = [...shown].sort((a, b) => a.price - b.price || percentOff(b) - percentOff(a));
  else shown = [...shown].sort((a, b) => percentOff(b) - percentOff(a) || saving(b) - saving(a));
  return shown;
}

function filterNote(state) {
  const parts = [];
  if (state.q) parts.push(`matching "${state.q}"`);
  if (state.category) parts.push(state.category);
  if (state.store) parts.push(state.store);
  if (state.discount === '40') parts.push('40%+ off');
  if (state.discount === '50') parts.push('50%+ off');
  if (state.discount === 'newlow') parts.push('new lows only');
  if (state.sort === 'saving') parts.push('sorted by biggest saving');
  if (state.sort === 'price') parts.push('sorted by lowest price');
  return parts.join(' · ');
}

function renderList() {
  const state = readState();
  const shown = applyFilters(state);
  app.innerHTML = listPage(shown, state, {
    shown: shown.length,
    total: TOTAL,
    note: filterNote(state),
  });
  wireList(state);
}

function wireList(state) {
  const search = document.getElementById('q');
  const category = document.getElementById('category');
  const store = document.getElementById('store');
  const discount = document.getElementById('discount');
  const sort = document.getElementById('sort');
  const clear = document.getElementById('clear-filters');
  const clearEmpty = document.getElementById('clear-empty');

  // Keep the filter panel collapsed on phones so the first deal is visible
  // above the fold; open it by default on wider screens.
  const filtersWrap = document.querySelector('.filters-wrap');
  if (filtersWrap) filtersWrap.open = window.matchMedia('(min-width: 641px)').matches;

  // The grid and the count update live; the filter controls are never re-rendered
  // while the shopper types, so focus stays where it is.
  const refreshGrid = () => {
    const shown = applyFilters(state);
    const grid = app.querySelector('.grid');
    const empty = app.querySelector('.empty');
    const count = document.getElementById('count');
    count.textContent = `${shown.length} of ${TOTAL} deals${filterNote(state) ? ` · ${filterNote(state)}` : ''}`;
    if (shown.length === 0) {
      if (grid) grid.outerHTML = '<p class="empty">No deal matches those filters. <button type="button" id="clear-empty" class="btn btn-ghost">Clear all filters</button></p>';
      document.getElementById('clear-empty')?.addEventListener('click', resetAll);
    } else {
      const html = `<div class="grid">${shown.map((d) => cardHtml(d)).join('')}</div>`;
      if (grid) grid.outerHTML = html;
      else if (empty) empty.outerHTML = html;
    }
    writeState(state);
  };

  const resetAll = () => {
    state.q = '';
    state.category = '';
    state.store = '';
    state.discount = '';
    state.sort = 'discount';
    // Clear the DOM controls too, then re-render the grid from the blank
    // state. (Calling renderList() here would re-derive the state from the
    // stale URL hash and un-clear everything.)
    if (search) search.value = '';
    if (category) category.value = '';
    if (store) store.value = '';
    if (discount) discount.value = '';
    if (sort) sort.value = 'discount';
    refreshGrid();
    document.getElementById('q')?.focus();
  };

  search.addEventListener('input', () => {
    state.q = search.value;
    refreshGrid();
  });
  category.addEventListener('change', () => {
    state.category = category.value;
    refreshGrid();
  });
  store.addEventListener('change', () => {
    state.store = store.value;
    refreshGrid();
  });
  discount.addEventListener('change', () => {
    state.discount = discount.value;
    refreshGrid();
  });
  sort.addEventListener('change', () => {
    state.sort = sort.value;
    refreshGrid();
  });
  clear.addEventListener('click', resetAll);
  clearEmpty?.addEventListener('click', resetAll);
}

// A card's HTML, reused when the grid refreshes live. It is views.js's card
// builder, imported so the live refresh and the first render never drift.
const cardHtml = dealCardHtml;

function render() {
  window.__shotReady = false;
  const match = location.hash.match(/^#\/deal\/([^/?#]+)/);
  if (match) {
    const found = deals.find((d) => d.id === decodeURIComponent(match[1]));
    document.title = `${found ? found.title : 'Deal not found'} | Deal Beacon`;
    if (found) {
      const related = deals
        .filter((d) => d.category === found.category && d.id !== found.id)
        .sort((a, b) => percentOff(b) - percentOff(a))
        .slice(0, 3);
      app.innerHTML = dealPage(found, related);
    } else {
      app.innerHTML = missingPage();
    }
  } else {
    document.title = 'Deal Beacon — Black Friday 27 November 2026';
    renderList();
  }
  // An in-page anchor (e.g. #how-we-verify from the footer) should land on
  // its section, not the top of the page.
  const anchorId = location.hash.startsWith('#') && !location.hash.startsWith('#/')
    ? location.hash.slice(1)
    : '';
  if (anchorId) {
    document.getElementById(anchorId)?.scrollIntoView();
  } else {
    window.scrollTo(0, 0);
  }
  window.__shotReady = true;
}

window.addEventListener('hashchange', render);
render();
