import Link from "next/link";

const NAV = [
  { href: "/home", label: "Home" },
  { href: "/jobs", label: "Job Board" },
  { href: "/events", label: "Events" },
  { href: "/calendar", label: "Calendar" },
  { href: "/contacts", label: "Contacts" },
  { href: "/pages", label: "Family Pages" },
  { href: "/scripture", label: "Scripture" },
  { href: "/games", label: "Fun & Games" },
  { href: "/resources", label: "Resources" },
];

export function Sidebar() {
  return (
    <nav
      style={{
        background: "var(--navy-deep)",
        borderBottom: "1px solid var(--gold)",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          style={{
            color: "var(--cream)",
            padding: "12px 18px",
            fontSize: "0.95rem",
            letterSpacing: 1,
            textDecoration: "none",
            transition: "background 0.2s",
            borderBottom: "3px solid transparent",
          }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
