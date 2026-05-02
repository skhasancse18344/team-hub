/**
 * <Button>
 *
 * @param {"primary"|"secondary"|"ghost"|"danger"} variant  (default "primary")
 * @param {"sm"|"md"|"lg"}                          size     (default "md")
 * @param {boolean}  loading   shows spinner, disables interaction
 * @param {boolean}  fullWidth stretches to 100%
 * @param {ReactNode} icon     optional icon placed before children
 *
 * Usage:
 *   <Button onClick={save}>Save</Button>
 *   <Button variant="danger" loading={deleting}>Delete</Button>
 *   <Button variant="secondary" icon={<Plus size={14} />}>New goal</Button>
 */
import Spinner from "./Spinner";
import styles from "./Button.module.css";

export default function Button({
  children,
  variant   = "primary",
  size      = "md",
  loading   = false,
  fullWidth = false,
  icon,
  className = "",
  ...props
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={[
        styles.btn,
        styles[variant],
        styles[size],
        fullWidth  ? styles.full : "",
        loading    ? styles.loading : "",
        className,
      ].filter(Boolean).join(" ")}
    >
      {loading
        ? <Spinner size={14} color={variant === "primary" || variant === "danger" ? "#fff" : "var(--brand)"} />
        : icon && <span className={styles.icon}>{icon}</span>
      }
      {children}
    </button>
  );
}
