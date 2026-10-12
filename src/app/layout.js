import "./globals.css";

export const metadata = {
  title: {
    default: "Laundry Management System",
    template: "%s | Laundry Management System",
  },
  description:
    "Sistem informasi manajemen laundry untuk mengelola pesanan, pembayaran, dan notifikasi WhatsApp.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1E3A5F",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
