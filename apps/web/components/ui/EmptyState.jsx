/**
 * <EmptyState>
 *
 * @param {ReactNode} icon     icon element (e.g. <Target size={36} />)
 * @param {string}    title    bold heading
 * @param {string}    message  secondary text
 * @param {string}    actionLabel  button label (optional)
 * @param {Function}  onAction    button click handler
 *
 * Usage:
 *   <EmptyState
 *     icon={<Target size={36} />}
 *     title="No goals yet"
 *     message="Create your first goal to get started."
 *     actionLabel="New goal"
 *     onAction={() => setShowForm(true)}
 *   />
 */
import Button from "./Button";
import styles from "./EmptyState.module.css";

export default function EmptyState({ icon, title, message, actionLabel, onAction }) {
  return (
    <div className={styles.root}>
      {icon && <div className={styles.icon}>{icon}</div>}
      {title   && <p className={styles.title}>{title}</p>}
      {message && <p className={styles.message}>{message}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" className={styles.action}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
