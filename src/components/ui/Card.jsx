export function Card({ className = "", children }) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

export function CardHeader({ title, description, action, className = "" }) {
  return (
    <header
      className={`flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 ${className}`}
    >
      <div>
        <h2 className="text-base font-semibold text-brand-navy">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}

export function CardBody({ className = "", children }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

export default Card;
