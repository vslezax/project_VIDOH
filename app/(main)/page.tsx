import hero from "./page.hero.module.css";
import heroScale from "./page.hero.scale.module.css";
import fav from "./page.fav.module.css";
import favScale from "./page.fav.scale.module.css";
import events from "./page.events.module.css";
import eventsScale from "./page.eventsScale.scale.module.css";

import MainEvent from "./_mainEvents/mainEvent"
import ButtonMap from "./_button_ToMap/buttonToMap"

export default function Home() {
  return (
    <main className={`flex flex-col`}>
      <div className={`${hero.hero} ${heroScale.root}`}>
        <div className={hero.content}>
          <div className={hero.text}>
            <div className={hero.titleSubtitle}>
              <div className={hero.subtitle}>найди своё</div>
              <div className={hero.title}>ЗАНЯТИЕ ПО ДУШЕ</div>
            </div>
            <div className={hero.description}>Мастер-классы и камерные события для тех, кто ищет живые эмоции, новые навыки и интересные знакомства. Просто выбери своё</div>
          </div>
          <div className={hero.buttonsContainer}>
            <div className={hero.leftButtonContainer}>
              <div className={hero.buttonText}>Зарегистрироваться</div>
            </div>
            <div className={hero.rightButtonContainer}>
              <div className={hero.buttonText}>Стать исполнителем</div>
            </div>
          </div>
        </div>
      </div>

      <div className={`${fav.main} ${favScale.root}`}>
        <div className={fav.textContainer}>
          <div className={fav.textTitle}>РЕКОМЕНДАЦИИ</div>
          <div className={fav.textSubtitle}>Мероприятия, которые нельзя пропустить</div>
        </div>
        <div className={fav.mainEventsContainer}>
          <MainEvent
              date="23 окт, 19:00"
              name="Гончарный вечер «Первая чашка»"
              description="Слепи свою первую чашку на гончарном круге — с нуля, за один вечер"
              location="Невский проспект, 23"
              image="/images/events/conference.jpg"
              scaleFactor={1}
          />
          <MainEvent
              date="23 окт, 19:00"
              name="Гончарный вечер «Первая чашка»"
              description="Слепи свою первую чашку на гончарном круге — с нуля, за один вечер"
              location="Невский проспект, 23"
              image="/images/events/conference.jpg"
              scaleFactor={1}
          />
          <MainEvent
              date="23 окт, 19:00"
              name="Гончарный вечер «Первая чашка»"
              description="Слепи свою первую чашку на гончарном круге — с нуля, за один вечер"
              location="Невский проспект, 23"
              image="/images/events/conference.jpg"
              scaleFactor={1}
          />
        </div>
      </div>

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
    </main>
  );
}
