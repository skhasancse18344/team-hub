/**
 * <Badge>
 *
 * Renders coloured pill labels for statuses, priorities, and custom values.
 *
 * @param {"status"|"priority"|"custom"} type   (default "custom")
 * @param {string} value  GoalStatus or Priority enum value, OR any string for custom
 * @param {string} color  explicit CSS color (only used when type="custom")
 *
 * Built-in status colours  : NOT_STARTED · IN_PROGRESS · COMPLETED · CANCELLED
 *                            TODO · IN_REVIEW · DONE (ActionStatus)
 * Built-in priority colours: URGENT · HIGH · MEDIUM · LOW
 *
 * Usage:
 *   <Badge type="status"   value="IN_PROGRESS" />
 *   <Badge type="priority" value="HIGH" />
 *   <Badge value="Beta" color="#06b6d4" />
 */
import styles from "./Badge.module.css";

const STATUS_MAP = {
  NOT_STARTED: { label: "Not Started", color: "#64748b" },
  IN_PROGRESS: { label: "In Progress", color: "#f59e0b" },
  COMPLETED:   { label: "Completed",   color: "#10b981" },
  CANCELLED:   { label: "Cancelled",   color: "#6b7280" },
  TODO:        { label: "To Do",       color: "#64748b" },
  IN_REVIEW:   { label: "In Review",   color: "#06b6d4" },
  DONE:        { label: "Done",        color: "#10b981" },
  PENDING:     { label: "Pending",     color: "#f59e0b" },
};

const PRIORITY_MAP = {
  URGENT: { label: "Urgent", color: "#ef4444" },
  HIGH:   { label: "High",   color: "#f97316" },
  MEDIUM: { label: "Medium", color: "#f59e0b" },
  LOW:    { label: "Low",    color: "#6b7280" },
};

export default function Badge({ type = "custom", value = "", color }) {
  let label = value;
  let bg    = color ?? "var(--brand)";

  if (type === "status" && STATUS_MAP[value]) {
    label = STATUS_MAP[value].label;
    bg    = STATUS_MAP[value].color;
  } else if (type === "priority" && PRIORITY_MAP[value]) {
    label = PRIORITY_MAP[value].label;
    bg    = PRIORITY_MAP[value].color;
  }

  return (
    <span
      className={styles.badge}
      style={{
        background: bg + "22",
        color:      bg,
        borderColor: bg + "44",
      }}
    >
      {label}
    </span>
  );
}
