import hero from "./page.hero.module.css";
import heroScale from "./page.hero.scale.module.css";

import RecommendedEvents from "./RecommendedEvents/RecommendedEvents";
import EventsList from "./EventsList/EventsList";

export default function Home() {
  return (
    <main className={`flex flex-col`}>
      <div className={`${hero.main} ${heroScale.root}`}>
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

      <RecommendedEvents/>
      <EventsList/>
    </main>
  );
}
