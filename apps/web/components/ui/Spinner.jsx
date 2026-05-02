/**
 * <Spinner>
 *
 * @param {number}  size   diameter in px (default 24)
 * @param {string}  color  CSS color (default --brand)
 * @param {string}  className  extra class
 *
 * Usage:
 *   <Spinner />
 *   <Spinner size={32} color="var(--emerald)" />
 */
import styles from "./Spinner.module.css";

export default function Spinner({ size = 24, color = "var(--brand)", className = "" }) {
  return (
    <div
      className={`${styles.spinner} ${className}`}
      style={{
        width:       size,
        height:      size,
        borderColor: `color-mix(in srgb, ${color} 18%, transparent)`,
        borderTopColor: color,
      }}
      role="status"
      aria-label="Loading"
    />
  );
}
