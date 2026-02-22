"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink() {
  const pathname = usePathname();
  const isGallery = pathname === "/gallery";

  return (
    <Link
      href={isGallery ? "/" : "/gallery"}
      className="text-[#ededed] hover:text-[#d4af37] transition-colors"
    >
      {isGallery ? "Home" : "Gallery"}
    </Link>
  );
}
