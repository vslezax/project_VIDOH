## АРХИТЕКТУРНОЕ ТРЕБОВАНИЕ
Вся логика отображения списка (получение данных, расчёт пагинации, подготовка пропсов для плашек) должна быть вынесена в отдельный файл, лежащий рядом с файлом страницы, в котором эта логика используется. Файл страницы должен быть максимально тонким: принять searchParams, вызвать функцию из соседнего файла, отрендерить результат. Например: app/events/page.tsx + app/events/logic.ts (или data.ts / get-events.ts — выбери имя и обоснуй). Аналогично для компонентов, если у них появляется нетривиальная логика — выносить в соседний файл.

## ПЕРЕМЕННЫЕ ФУНКЦИИ EventComponent()
Переменные функции EventComponent() описаны в соответствующем ей .tsx файле. Необходимые аттрибуты, таблицы и зависимости отображены в файлах построения БД в директории "./__db_info/"

## СТРАНИЦА СПИСКА (app/events/page.tsx)
- Server Component.
- Принимает searchParams: { page?: string }.
- Вся логика — в соседнем файле app/events/logic.ts (имя обоснуй). Функция, например, getEventsPage(pageParam: string | undefined): Promise<{ events: EventCardProps[]; page: number; totalPages: number; count: number; redirectTo?: string }>.
- PAGE_SIZE = 12 вынести в lib/config.ts как константу с комментарием, что это 3 колонки × 4 ряда.
- Внутри logic.ts выполняются ДВА запроса:
  1. prisma.event.count()
  2. prisma.event.findMany({ skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, orderBy: { id: 'asc' }, include: { media: true, venue: true } })
- totalPages = Math.ceil(count / PAGE_SIZE).
- Если page < 1 или page > totalPages при count > 0 — вернуть redirectTo с валидным page, страница выполняет redirect() (или notFound() — выбери и обоснуй).
- Рендер: сетка <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">.
- Внутри — EventCard для каждого ивента.
- Пагинация — компонент с prev/next (и номерами страниц, если уместно). Ссылки через next/link, href сохраняет ?page=N.
- Если count === 0 — сообщение «Мероприятий пока нет».

## ОБРАБОТКА ОШИБОК И EDGE CASES
- media пуст → плашка без изображения.
- venue_id IS NULL AND online_URL IS NOT NULL → написать "Онлайн мероприятие".
- venue_id IS NULL AND online_URL IS NULL → написать "Локация не указана".
- Некорректный page (NaN, 0, отрицательный) → page = 1.
- page > totalPages при count > 0 → редирект на ?page=1.

## ЧЕГО НЕ ДЕЛАТЬ
- Не выгружать все записи из БД.
- Не использовать диапазоны id для пагинации — только skip/take.
- Не реализовывать страницу /event/[slug] — только ссылку.
- Не реализовывать загрузку файлов в B2.

## ВЫВОД
Объясни ключевые решения. Соблюдай требование: файл страницы тонкий, вся логика отображения — в соседнем файле.