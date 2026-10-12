import {
  Baby,
  BedDouble,
  BedSingle,
  Cloud,
  Footprints,
  Layers,
  Package,
  Shirt,
  WashingMachine,
  Zap,
} from "./icons";

/**
 * Ikon & warna hiasan untuk kartu layanan.
 *
 * Pemetaan dilakukan berdasarkan kata kunci pada nama layanan sehingga
 * layanan baru yang dibuat admin lewat halaman Layanan otomatis mendapat
 * ikon yang sesuai — tanpa perlu menambah kolom baru di database.
 *
 * Urutan aturan penting: misalnya "Cuci Setrika" harus terkena aturan "cuci"
 * (mesin cuci), bukan "setrika".
 */
const RULES = [
  {
    test: /express|kilat|instan|cepat|same\s*day/,
    Icon: Zap,
    tone: "bg-amber-100 text-amber-700",
  },
  {
    test: /bed\s*cover|bedcover|cover/,
    Icon: BedDouble,
    tone: "bg-indigo-100 text-indigo-700",
  },
  {
    test: /sprei|laken|sheet/,
    Icon: BedSingle,
    tone: "bg-violet-100 text-violet-700",
  },
  {
    test: /selimut|blanket/,
    Icon: Layers,
    tone: "bg-emerald-100 text-emerald-700",
  },
  {
    test: /sepatu|sneaker|shoe|sandal/,
    Icon: Footprints,
    tone: "bg-rose-100 text-rose-600",
  },
  {
    test: /cuci|wash/,
    Icon: WashingMachine,
    tone: "bg-brand-blue/15 text-sky-600",
  },
  {
    test: /setrika|steam|press/,
    Icon: Shirt,
    tone: "bg-brand-navy/10 text-brand-navy",
  },
  {
    test: /boneka|doll|mainan/,
    Icon: Baby,
    tone: "bg-pink-100 text-pink-700",
  },
  {
    test: /handuk|bantal|guling|towels?/,
    Icon: Cloud,
    tone: "bg-cyan-100 text-cyan-700",
  },
];

/** Ikon cadangan bila nama layanan tidak cocok aturan mana pun. */
const FALLBACK = {
  KG: { Icon: Shirt, tone: "bg-brand-navy/10 text-brand-navy" },
  ITEM: { Icon: Package, tone: "bg-slate-100 text-slate-600" },
};

/** Menentukan ikon & kelas warna untuk sebuah layanan. */
export function visualForService(name, priceUnit) {
  const text = String(name ?? "").toLowerCase();
  for (const rule of RULES) {
    if (rule.test.test(text)) return { Icon: rule.Icon, tone: rule.tone };
  }
  return FALLBACK[priceUnit] ?? FALLBACK.ITEM;
}

const CONTAINER_SIZES = {
  xs: "h-7 w-7 rounded-md",
  sm: "h-9 w-9 rounded-lg",
  md: "h-10 w-10 rounded-xl",
  lg: "h-12 w-12 rounded-xl",
};

const ICON_SIZES = {
  xs: "h-3.5 w-3.5",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

/**
 * Badge ikon layanan. Bersifat hiasan saja (dekoratif), sehingga ditandai
 * `aria-hidden` — nama layanan sudah dibacakan oleh teks di sebelahnya.
 */
export default function ServiceIcon({
  name,
  priceUnit,
  size = "md",
  className = "",
}) {
  const { Icon, tone } = visualForService(name, priceUnit);

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center ${
        CONTAINER_SIZES[size] ?? CONTAINER_SIZES.md
      } ${tone} ${className}`}
    >
      <Icon className={ICON_SIZES[size] ?? ICON_SIZES.md} />
    </span>
  );
}
