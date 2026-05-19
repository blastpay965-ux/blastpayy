import CrashGame from '@/components/Virtuals/CrashGame';
import styles from './page.module.css';

export default function VirtualsPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={`container ${styles.heroContent}`}>
          <h1>Virtual <span className={styles.highlight}>Games</span></h1>
          <p>Instant wins, non-stop action. Play our provably fair crash game.</p>
        </div>
      </section>

      <section className={`container ${styles.gamesSection}`}>
        <div className={styles.gameWrapper}>
          <div className={styles.gameHeader}>
            <h2>Aviator Crash</h2>
            <div className={styles.liveIndicator}>
              <span className={styles.dot}></span> Live Multiplayer
            </div>
          </div>
          <CrashGame />
        </div>
      </section>
    </div>
  );
}
