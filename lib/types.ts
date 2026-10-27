// lib/events/types.ts

// ============================================================
// ОБЩИЕ
// ============================================================
// "past" НЕ хранится в БД — вычисляется из endsAt < now
export type EventStatus = "draft" | "published" | "cancelled";

export type Coordinates = {
    lat: number;
    lng: number;
};



// ============================================================
// ЛОКАЦИЯ
// ============================================================
export type Location = {
    id: string;
    name: string;        // "Гончарная мастерская"
    address: string;     // "Невский проспект, 23"
    city?: string;       // на будущее, если появятся другие города
    coordinates: Coordinates;
};



// ============================================================
// ОРГАНИЗАТОР
// ============================================================
export type Organizer = {
    id: string;
    slug: string;              // для /organizers/[slug]
    name: string;              // имя или название студии
    bio: string;               // короткое описание
    avatar: string;            // URL изображения
};



// ============================================================
// КАТЕГОРИЯ (то, что ты называл «фильтрами»)
// ============================================================
export type Category = {
    id: string;
    slug: string;              // для /category/[slug]/
    title: string;             // "Мастер-класс"
};



// ============================================================
// МЕРОПРИЯТИЕ
// ============================================================
export type Event = {
    id: string;
    slug: string;              // "/event/goncharny-vecher-pervaya-chashka"

    title: string;
    shortDescription: string;  // для карточек
    fullDescription: string;   // для страницы

    startsAt: string;          // ISO-строка: "2026-10-23T19:00:00+03:00"
    endsAt: string;            // ISO-строка

    location: Location;
    organizers: Organizer[];

    coverImage: string;
    gallery: string[];

    isFree: boolean;
    price: number | null;      // null если бесплатно
    currency: string;

    // категоризация
    category: Category;
    tags: string[];            // ["мастер-класс"]

    status: EventStatus;

    // служебное
    createdAt: string;
    updatedAt: string;
};

// ============================================================
// ПРОИЗВОДНЫЕ / УТИЛИТАРНЫЕ
// ============================================================

// Усечённая версия для карточек в списках — не тянуть
// fullDescription и gallery туда, где они не нужны
export type EventCardData = Pick<
    Event,
    | "id"
    | "slug"
    | "title"
    | "shortDescription"
    | "startsAt"
    | "coverImage"
    | "isFree"
    | "price"
    | "currency"
    | "category"
    | "status"
> & {
    location: Pick<Location, "name" | "address">;
    organizers: Pick<Organizer, "id" | "name" | "avatar">[];
};

// Помощник для UI: «уже прошло»
export function isPast(event: Pick<Event, "endsAt">): boolean {
    return new Date(event.endsAt).getTime() < Date.now();
}

// Помощник: отменено ли
export function isCancelled(event: Pick<Event, "status">): boolean {
    return event.status === "cancelled";
}