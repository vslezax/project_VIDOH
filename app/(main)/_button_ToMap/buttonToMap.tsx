import styles from "./buttonToMap.module.css";
import IconMap from "@/public/icons/icon_Map.svg";

type Props = { scaleFactor?: number };

export default function ButtonMap({ scaleFactor = 1 }: Props) {
    return (
        <button
            type="button"
            className={styles.main}
            style={{ "--scale": scaleFactor } as React.CSSProperties}
        >
            <IconMap className={styles.iconMap} />
            <span className={styles.text}>Картой</span>
        </button>
    );
}