import styles from './ApiLoader.module.scss';

function ApiLoader() {
  return (
    <div className={styles.loader}>
      <div className={styles.spinner}></div>
      <p className={styles.text}>Loading VibePost</p>
    </div>
  );
}

export { ApiLoader };
