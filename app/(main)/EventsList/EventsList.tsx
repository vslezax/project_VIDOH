import events from "./EventsList.module.css";
import eventsScale from "./EventsList.scale.module.css";

import ButtonMap from "@/app/(main)/EventsList/Button_ListToMap/Button_ListToMap"

export default function EventsList() {
    return(
        <div className={`${events.main} ${eventsScale.root}`}>
            <div className={events.container}>
                <div className={events.textButtonContainer}>
                    <div className={events.textContainer}>
                        <div className={events.title}>Мероприятия</div>
                        <div className={events.subtitle}>Яркие события, новые впечатления и люди, разделяющие твои эмоции</div>
                    </div>
                    <ButtonMap scaleFactor={2}/>
                </div>
                <div className={events.eventsContainer}>

                </div>
            </div>
        </div>
    )
}