"use client";

import Link from "next/link";

type Props = {
  href?: string;
  children?: React.ReactNode;
};

export function BackLink({ href = "/", children = "← Bosh sahifa" }: Props) {
  return (
    <Link href={href} className="fd-back-link">
      {children}
    </Link>
  );
}
