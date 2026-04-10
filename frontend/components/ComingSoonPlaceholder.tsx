import { BackLink } from "./BackLink";

type ComingSoonPlaceholderProps = {
  title: string;
  backHref?: string;
};

export function ComingSoonPlaceholder({ title, backHref = "/" }: ComingSoonPlaceholderProps) {
  return (
    <div className="fd-shell fd-section fd-coming-soon">
      <BackLink href={backHref} />
      <h1 className="fd-section-title fd-coming-soon__title">{title}</h1>
      <p className="fd-coming-soon__message">Tez orada paydo bo‘ladi.</p>
    </div>
  );
}
