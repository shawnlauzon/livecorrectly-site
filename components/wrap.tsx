import styles from "./wrap.module.css";

export default function Wrap({
  children,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "header" | "footer";
}) {
  return (
    <Tag className={`${styles.wrap}${className ? ` ${className}` : ""}`}>
      {children}
    </Tag>
  );
}
