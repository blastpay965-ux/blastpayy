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
        
        <div className={styles.infoSidebar}>
          <div className={styles.infoCard}>
            <h3>How to Play</h3>
            <ol>
              <li>Place a bet before the round starts.</li>
              <li>Watch the multiplier increase.</li>
              <li>Cash out before the crash to win!</li>
            </ol>
          </div>
          <div className={styles.infoCard}>
            <h3>Provably Fair</h3>
            <p>Our games use cryptographic algorithms to ensure 100% fairness and transparency.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
