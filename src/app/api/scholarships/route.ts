import { NextResponse } from "next/server";

export function GET() {
  const data = [
    { id: "1", name: "First‑Gen Scholars Award", amount: "$2,500", deadline: "Nov 15", link: "https://example.com/s/1", tags: ["first‑gen", "national"] },
    { id: "2", name: "STEM for All Grant", amount: "$5,000", deadline: "Dec 1", link: "https://example.com/s/2", tags: ["STEM", "GPA 3.0+"] },
    { id: "3", name: "Community Impact Scholarship", amount: "$1,000", deadline: "Oct 20", link: "https://example.com/s/3", tags: ["volunteering", "local"] },
  ];
  return NextResponse.json(data);
}
