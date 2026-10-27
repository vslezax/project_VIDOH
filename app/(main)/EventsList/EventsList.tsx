import { redirect } from "next/navigation";

import { EVENTS_SECTION_ID } from "@/lib/config";

import events from "./EventsList.module.css";
import eventsScale from "./EventsList.scale.module.css";

import ButtonMap from "./Button_ListToMap/Button_ListToMap";
import EventsGrid from "./EventsGrid";
import { getEventsPage } from "./get-events";

type EventsListProps = {
    /** Значение `?page=` при прямом заходе по ссылке; дальше страницы листаются на клиенте. */
    pageParam?: string;
};

/**
 * Секция «Мероприятия» на главной.
 *
 * Серверная часть: получить страницу для первого рендера (SSR, карточки в HTML)
 * и отдать её клиентскому контейнеру. Переключение страниц происходит в
 * `EventsGrid` — без навигации, изменения URL и перезагрузки страницы.
 */
export default async function EventsList({pageParam}: EventsListProps) {
    const initial = await getEventsPage(pageParam);

    // Номер страницы вне диапазона при прямом заходе по ссылке: уводим на первую.
    if (initial.redirectTo) redirect(initial.redirectTo);

    return(
        <div id={EVENTS_SECTION_ID} className={`${events.main} ${eventsScale.root}`}>
            <div className={events.container}>
                <div className={events.textButtonContainer}>
                    <div className={events.textContainer}>
                        <div className={events.title}>Мероприятия</div>
                        <div className={events.subtitle}>Яркие события, новые впечатления и люди, разделяющие твои эмоции</div>
                    </div>
                    <ButtonMap scaleFactor={2}/>
                </div>

                <EventsGrid initial={initial}/>
            </div>
        </div>
    )
}
