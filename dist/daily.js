function renderBytFront() {
  const front = document.getElementById('byt-front');
  if (!front || front.querySelector('.byt-sheet')) return;

  front.innerHTML = `
    <article class="byt-sheet" aria-labelledby="byt-cover-title">
      <header class="byt-mast">
        <div class="byt-edition">
          <span>Эфир 1993 <span aria-hidden="true">/</span> Выпуск 3</span>
          <span class="byt-folio">P510</span>
        </div>
        <h1 id="byt-cover-title"><span>Куплю,</span> <em>продам</em></h1>
        <div class="byt-mast-bottom">
          <p>Частные объявления и цены 1993 года</p>
          <button type="button" class="byt-search">Поиск по архиву <span aria-hidden="true">↗</span></button>
        </div>
      </header>

      <div class="byt-announcements">
        <a class="byt-story byt-exchange" href="#513" data-issue-code="513" aria-labelledby="byt-vaz-title byt-vaz-deck">
          <div class="byt-story-meta"><span>Частный обмен</span><span class="byt-folio">P513 <span aria-hidden="true">↗</span></span></div>
          <h2 id="byt-vaz-title">Меняю</h2>
          <p class="byt-exchange-deck" id="byt-vaz-deck">ВАЗ 1988 года<br> на&nbsp;пиломатериалы</p>
          <figure class="byt-cut byt-vaz-cut" data-byt-scan="513">
            <figcaption>«Ленинское знамя» <span aria-hidden="true">·</span> 18 сентября</figcaption>
          </figure>
        </a>

        <a class="byt-story byt-orsk" href="#514" data-issue-code="514" aria-labelledby="byt-orsk-title">
          <div class="byt-story-meta"><span>Частная продажа</span><span class="byt-folio">P514 <span aria-hidden="true">↗</span></span></div>
          <h2 id="byt-orsk-title">Новый «Орск»,<br> сруб и вагонка</h2>
          <figure class="byt-cut byt-orsk-cut" data-byt-scan="514">
            <figcaption>«Ленинское знамя» <span aria-hidden="true">·</span> Тотьма</figcaption>
          </figure>
        </a>
      </div>

      <div class="byt-market" aria-label="Цены и продажи">
        <a class="byt-story byt-price" href="#511" data-issue-code="511" aria-labelledby="byt-grocery-title">
          <div class="byt-story-meta"><span>Декабрь · Россия</span><span class="byt-folio">P511 <span aria-hidden="true">↗</span></span></div>
          <h2 id="byt-grocery-title">Почём хлеб</h2>
          <div class="byt-figure"><strong>466</strong> <span>руб./кг</span></div>
          <p>Средняя цена изделий из пшеничной муки высшего сорта.</p>
        </a>

        <a class="byt-story byt-price" href="#512" data-issue-code="512" aria-labelledby="byt-firewood-title">
          <div class="byt-story-meta"><span>9 октября · Тотемский район</span><span class="byt-folio">P512 <span aria-hidden="true">↗</span></span></div>
          <h2 id="byt-firewood-title">Дрова к зиме</h2>
          <div class="byt-figure"><strong>230</strong> <span>руб. / плотный м³</span></div>
          <p>Долготьё смешанных пород. Доставка — 350 руб./км.</p>
        </a>

        <a class="byt-story byt-sale" href="#516" data-issue-code="516" aria-labelledby="byt-shoes-title">
          <div class="byt-story-meta"><span>25 марта · Москва</span><span class="byt-folio">P516 <span aria-hidden="true">↗</span></span></div>
          <h2 id="byt-shoes-title">Мужские туфли</h2>
          <div class="byt-discount"><del aria-label="Было 61 доллар">$61</del> <span aria-hidden="true">→</span> <strong aria-label="Стало 28 долларов">$28</strong></div>
          <p>Уценка в торговом доме «Москва».</p>
        </a>

        <a class="byt-story byt-count" href="#515" data-issue-code="515" aria-labelledby="byt-tv-title">
          <div class="byt-story-meta"><span>Итоги года</span><span class="byt-folio">P515 <span aria-hidden="true">↗</span></span></div>
          <h2 id="byt-tv-title">Сколько продали телевизоров</h2>
          <p><b>2 млн 546 тыс.</b> за год по данным учтённых предприятий.</p>
        </a>
      </div>
    </article>`;

  for (const figure of front.querySelectorAll('[data-byt-scan]')) {
    const record = pages.get(Number(figure.dataset.bytScan));
    if (!record?.imageData) {
      figure.hidden = true;
      continue;
    }
    const image = document.createElement('img');
    image.src = record.imageData;
    image.alt = record.imageAlt || record.media?.[0]?.alt || 'Фрагмент газетного объявления';
    image.width = 870;
    image.height = figure.dataset.bytScan === '513' ? 252 : 258;
    figure.prepend(image);
  }

  front.querySelector('.byt-search').addEventListener('click', () => {
    document.getElementById('open-search')?.click();
  });
}
