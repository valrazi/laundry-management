export default function PageHeader({ title, description, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-navy sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex gap-2">{action}</div> : null}
    </div>
  );
}
