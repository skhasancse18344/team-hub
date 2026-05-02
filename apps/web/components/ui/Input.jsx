/**
 * <Input>
 *
 * @param {string}   label     field label
 * @param {string}   error     red error text below
 * @param {string}   hint      grey hint text below (only shown if no error)
 * @param {ReactNode} iconLeft  icon inside the left of the input
 * @param {ReactNode} iconRight icon inside the right of the input
 *
 * All other props forwarded to <input>.
 *
 * Usage:
 *   <Input label="Email" type="email" value={email} onChange={...} error={errors.email} />
 *   <Input label="Search" iconLeft={<Search size={14} />} placeholder="Find goals…" />
 */
import styles from "./Input.module.css";

export default function Input({
  label,
  error,
  hint,
  iconLeft,
  iconRight,
  className = "",
  id,
  ...props
}) {
  const fieldId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className={`${styles.wrapper} ${className}`}>
      {label && (
        <label htmlFor={fieldId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.inputWrap}>
        {iconLeft  && <span className={styles.iconLeft}>{iconLeft}</span>}
        <input
          id={fieldId}
          {...props}
          className={[
            styles.input,
            error     ? styles.inputError : "",
            iconLeft  ? styles.hasLeft    : "",
            iconRight ? styles.hasRight   : "",
          ].filter(Boolean).join(" ")}
        />
        {iconRight && <span className={styles.iconRight}>{iconRight}</span>}
      </div>
      {error && <p className={styles.error}>{error}</p>}
      {!error && hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}
