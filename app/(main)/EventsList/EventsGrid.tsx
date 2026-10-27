"use client";

import Link from "next/link";
import { useCallback, useRef, useState, useTransition } from "react";

import { EVENTS_SECTION_ID } from "@/lib/config";

import EventComponent from "./EventComponent/EventComponent";
import EventsPagination from "./EventsPagination/EventsPagination";
import grid from "./EventsList.module.css";
import { fetchEventsPage } from "./fetch-events-page";
import type { EventsPageResult } from "./get-events";

type EventsGridProps = {
  /** Первая страница, отрендеренная на сервере (SSR: карточки уже в HTML). */
  initial: EventsPageResult;
};

/** Плавно прокручивает к началу секции «Мероприятия» (id — из lib/config). */
function scrollToSection(): void {
  if (typeof document === "undefined") return;

  document.getElementById(EVENTS_SECTION_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Клиентский контейнер сетки мероприятий.
 *
 * Почему клиентский: переключение страниц не должно быть навигацией — URL не
 * меняется, страница не перезагружается и не перерисовывается целиком, RSC-payload
 * главной не запрашивается заново. Обновляется только этот контейнер:
 * данные приходят Server Action'ом `fetchEventsPage` (тот же `getEventsPage`).
 *
 * Уже загруженные страницы кэшируются в `Map`, поэтому возврат назад не делает
 * повторный запрос.
 */
export default function EventsGrid({ initial }: EventsGridProps) {
  const [result, setResult] = useState<EventsPageResult>(initial);
  const [isPending, startTransition] = useTransition();
  const cacheRef = useRef<Map<number, EventsPageResult>>(new Map([[initial.page, initial]]));

  const goToPage = useCallback(
    (nextPage: number) => {
      if (nextPage === result.page) return;
      if (nextPage < 1 || nextPage > Math.max(result.totalPages, 1)) return;

      const cached = cacheRef.current.get(nextPage);

      if (cached) {
        setResult(cached);
        scrollToSection();
        return;
      }

      startTransition(async () => {
        const next = await fetchEventsPage(nextPage);

        cacheRef.current.set(next.page, next);
        setResult(next);
        scrollToSection();
      });
    },
    [result.page, result.totalPages],
  );

  if (result.count === 0) {
    return <p className={grid.emptyState}>Мероприятий пока нет</p>;
  }

  return (
    <>
      <div
        className={`${grid.eventsContainer} ${isPending ? grid.eventsContainerPending : ""}`}
        aria-busy={isPending}
      >
        {result.events.map((card) => (
          <Link key={card.id} className={grid.cardLink} href={`/event/${card.slug}`}>
            <EventComponent
              name={card.name}
              description={card.description}
              location={card.location}
              image={card.image}
              scaleFactor={1}
            />
          </Link>
        ))}
      </div>

      <EventsPagination
        page={result.page}
        totalPages={result.totalPages}
        onPageChange={goToPage}
        disabled={isPending}
      />
    </>
  );
}
