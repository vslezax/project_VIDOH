"use client";

import pagination from "./EventsPagination.module.css";
import paginationScale from "./EventsPagination.scale.module.css";

type EventsPaginationProps = {
  page: number;
  totalPages: number;
  /** Переключение страницы: обновляет только контейнер сетки, без навигации. */
  onPageChange: (page: number) => void;
  /** Блокирует кнопки, пока идёт загрузка страницы. */
  disabled?: boolean;
};

/** Что показывать в ряду номеров: страницы и разделители-многоточия. */
type PageItem = number | "ellipsis";

/**
 * «Окно» номеров страниц: первая, последняя и текущая ± 1.
 * Так ряд остаётся коротким при любом количестве страниц.
 */
function buildPageItems(page: number, totalPages: number): PageItem[] {
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const visible = [...pages].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);

  const items: PageItem[] = [];

  visible.forEach((value, index) => {
    const previous = visible[index - 1];

    if (previous !== undefined && value - previous > 1) {
      items.push("ellipsis");
    }

    items.push(value);
  });

  return items;
}

/**
 * Навигация по страницам афиши.
 *
 * Это кнопки, а не ссылки: переключение страницы не меняет URL и не вызывает
 * переход — родительский `EventsGrid` подменяет данные в контейнере.
 */
export default function EventsPagination({
  page,
  totalPages,
  onPageChange,
  disabled = false,
}: EventsPaginationProps) {
  if (totalPages <= 1) return null;

  const items = buildPageItems(page, totalPages);

  return (
    <nav
      className={`${pagination.root} ${paginationScale.root}`}
      aria-label="Навигация по страницам мероприятий"
    >
      <button
        type="button"
        className={pagination.step}
        onClick={() => onPageChange(page - 1)}
        disabled={disabled || page <= 1}
      >
        Назад
      </button>

      {items.map((item, index) =>
        item === "ellipsis" ? (
          <span key={`gap-${index}`} className={pagination.ellipsis} aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            className={item === page ? `${pagination.page} ${pagination.pageActive}` : pagination.page}
            onClick={() => onPageChange(item)}
            aria-current={item === page ? "page" : undefined}
            disabled={disabled}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        className={pagination.step}
        onClick={() => onPageChange(page + 1)}
        disabled={disabled || page >= totalPages}
      >
        Вперёд
      </button>
    </nav>
  );
}
