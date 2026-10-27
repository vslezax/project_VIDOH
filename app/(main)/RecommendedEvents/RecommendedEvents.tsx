import fav from "./RecommendedEvents.module.css";
import favScale from "./RecommendedEvents.scale.module.css";

import RecommendedEventComponent from "@/app/(main)/RecommendedEvents/RecommendedEventComponent/RecommendedEventComponent"

export default function RecommendedEvents() {
    return(
        <div className={`${fav.main} ${favScale.root}`}>
            <div className={fav.textContainer}>
                <div className={fav.textTitle}>РЕКОМЕНДАЦИИ</div>
                <div className={fav.textSubtitle}>Мероприятия, которые нельзя пропустить</div>
            </div>
            <div className={fav.mainEventsContainer}>
                <RecommendedEventComponent
                    date="23 окт, 19:00"
                    name="Гончарный вечер «Первая чашка»"
                    description="Слепи свою первую чашку на гончарном круге — с нуля, за один вечер"
                    location="Невский проспект, 23"
                    image="/images/events/conference.jpg"
                    scaleFactor={1}
                />
                <RecommendedEventComponent
                    date="23 окт, 19:00"
                    name="Гончарный вечер «Первая чашка»"
                    description="Слепи свою первую чашку на гончарном круге — с нуля, за один вечер"
                    location="Невский проспект, 23"
                    image="/images/events/conference.jpg"
                    scaleFactor={1}
                />
                <RecommendedEventComponent
                    date="23 окт, 19:00"
                    name="Гончарный вечер «Первая чашка»"
                    description="Слепи свою первую чашку на гончарном круге — с нуля, за один вечер"
                    location="Невский проспект, 23"
                    image="/images/events/conference.jpg"
                    scaleFactor={1}
                />
            </div>
        </div>
    )
}