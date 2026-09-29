import React from "react";

import styles from "./mainEvent.module.css";
import scale from "./mainEvent.scale.module.css";
import IconPin from "@/public/icons/icon_Pin.svg";

type MainEventProps = {
    date: string;
    name: string;
    description: string;
    location: string;
    image?: string;
    scaleFactor?: number;
};

export default function MainEvent({
                                      date,
                                      name,
                                      description,
                                      location,
                                      image,
                                      scaleFactor = 1,
                                  }: MainEventProps) {
    return (
        <main
            className={`${styles.main} ${scale.root}`}
            style={{ "--scale": scaleFactor } as React.CSSProperties}
        >
            <div className={styles.darkRectangle}/>
            <div className={styles.purpleRectangle}/>

            <div className={styles.content}>
                <div className={styles.date}>{date}</div>
                <div className={styles.infoContainer}>
                    <div className={styles.nameContainer}>
                        <div className={styles.name}>{name}</div>
                        <div className={styles.description}>{description}</div>
                    </div>
                    <div className={styles.locationContainer}>
                        <IconPin className={styles.pinIcon}/>
                        <div className={styles.location}>{location}</div>
                    </div>
                </div>
            </div>

            <div
                className={styles.image}
                style={image ? { backgroundImage: `url(${image})` } : undefined}
            />
        </main>
    );
}